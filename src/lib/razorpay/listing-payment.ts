import type { SupabaseClient } from "@supabase/supabase-js";
import type Razorpay from "razorpay";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { validateListingCoupon } from "@/lib/coupons/listing";
import { getRazorpayEnvStatus, publicRazorpayKey } from "@/lib/razorpay/client";
import { razorpayErrorResponse } from "@/lib/razorpay/errors";

export type ListingOrderResult =
  | {
      ok: true;
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      pendingId: string;
      creatorName: string;
      username: string;
      receipt: string;
      originalAmountInr: number;
      discountInr: number;
      finalAmountInr: number;
    }
  | { ok: false; status: number; error: string; details?: string; code?: string };

export type ListingVerifyResult =
  | {
      ok: true;
      verified: true;
      username?: string;
      duplicate?: boolean;
      alreadyVerified?: boolean;
      published?: boolean;
    }
  | { ok: false; status: number; error: string; verified: false };

export type ListingWebhookPayment = {
  id: string;
  order_id: string;
  notes?: Record<string, string>;
};

/** Idempotent: verifies listing payment and auto-publishes creator (no admin step). */
export async function applyVerifiedListingPaymentRpc(
  admin: SupabaseClient,
  input: {
    creatorId: string;
    pendingId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    paidAmountPaise?: number;
  },
): Promise<ListingVerifyResult> {
  const { creatorId, pendingId, razorpayPaymentId, razorpaySignature, paidAmountPaise } = input;

  const { data: existingByPaymentId } = await admin
    .from("creator_listing_payments")
    .select("id, is_verified, creator_id")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();

  if (existingByPaymentId?.is_verified) {
    const { data: creator } = await admin
      .from("creators")
      .select("instagram_username, status, listing_payment_status")
      .eq("id", existingByPaymentId.creator_id)
      .maybeSingle();
    return {
      ok: true,
      verified: true,
      duplicate: true,
      username: creator?.instagram_username,
      published: creator?.status === "active" && creator?.listing_payment_status === "paid",
    };
  }

  const rpcArgs: Record<string, unknown> = {
    p_creator_id: creatorId,
    p_payment_row_id: pendingId,
    p_razorpay_payment_id: razorpayPaymentId,
    p_razorpay_signature: razorpaySignature,
  };
  if (typeof paidAmountPaise === "number") {
    rpcArgs.p_paid_amount_paise = paidAmountPaise;
  }

  const { data, error } = await admin.rpc("apply_verified_listing_payment", rpcArgs);

  if (error) {
    // Fallback to 4-arg RPC if migration 0007 not applied yet
    if (typeof paidAmountPaise === "number") {
      const fallback = await admin.rpc("apply_verified_listing_payment", {
        p_creator_id: creatorId,
        p_payment_row_id: pendingId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_razorpay_signature: razorpaySignature,
      });
      if (!fallback.error) {
        const result = fallback.data as { ok?: boolean; error?: string; already_verified?: boolean };
        if (result?.ok) {
          const { data: creator } = await admin
            .from("creators")
            .select("instagram_username, status, listing_payment_status")
            .eq("id", creatorId)
            .maybeSingle();
          return {
            ok: true,
            verified: true,
            username: creator?.instagram_username,
            alreadyVerified: Boolean(result.already_verified),
            published: creator?.status === "active" && creator?.listing_payment_status === "paid",
          };
        }
      }
    }
    console.error("[listing-payment] rpc failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      creatorId,
      pendingId,
    });
    return { ok: false, status: 500, error: "Could not publish this creator.", verified: false };
  }

  const result = data as { ok?: boolean; error?: string; already_verified?: boolean };
  if (!result?.ok) {
    return {
      ok: false,
      status: 400,
      error: result?.error ?? "Could not publish this creator.",
      verified: false,
    };
  }

  const { data: creator } = await admin
    .from("creators")
    .select("instagram_username, status, listing_payment_status")
    .eq("id", creatorId)
    .maybeSingle();

  return {
    ok: true,
    verified: true,
    username: creator?.instagram_username,
    alreadyVerified: Boolean(result.already_verified),
    published: creator?.status === "active" && creator?.listing_payment_status === "paid",
  };
}

export async function createListingPaymentOrder(
  admin: SupabaseClient,
  razorpay: Razorpay,
  input: { creatorId: string; payerName: string; payerEmail: string; couponCode?: string | null },
): Promise<ListingOrderResult> {
  const { creatorId, payerName, payerEmail, couponCode } = input;
  const envStatus = getRazorpayEnvStatus();
  const keyId = publicRazorpayKey();
  if (!envStatus.configured || !keyId) {
    return {
      ok: false,
      status: 503,
      error: "Payments are not configured yet.",
      details: envStatus.issues.join(" "),
      code: "razorpay_env_invalid",
    };
  }

  const { data: creator } = await admin
    .from("creators")
    .select("id, name, instagram_username, status, listing_payment_status")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) {
    return { ok: false, status: 404, error: "Creator not found." };
  }

  if (creator.listing_payment_status === "paid" && creator.status === "active") {
    return { ok: false, status: 409, error: "This creator is already published." };
  }

  const coupon = await validateListingCoupon(admin, couponCode);
  const finalAmountInr = coupon.valid ? coupon.finalAmountInr : coupon.finalAmountInr;
  const discountInr = coupon.valid ? coupon.discountInr : 0;
  const originalAmountInr = MIN_LISTING_PAYMENT;
  const amountPaise = coupon.valid ? coupon.amountPaise : MIN_LISTING_PAYMENT * 100;
  const appliedCouponCode = coupon.valid ? coupon.code : null;

  const { data: existingPending } = await admin
    .from("creator_listing_payments")
    .select("id, razorpay_order_id, is_verified, amount")
    .eq("creator_id", creatorId)
    .eq("is_verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pendingId = existingPending?.id;

  if (!pendingId) {
    const { data: pending, error: insertError } = await admin
      .from("creator_listing_payments")
      .insert({
        creator_id: creatorId,
        payer_name: payerName,
        payer_email: payerEmail,
        amount: finalAmountInr,
        original_amount: originalAmountInr,
        discount_amount: discountInr,
        coupon_code: appliedCouponCode,
        currency: "INR",
        payment_status: "pending",
        is_verified: false,
      })
      .select("id")
      .single();

    if (insertError || !pending) {
      console.error("[listing-payment] pending insert failed", {
        code: insertError?.code,
        message: insertError?.message,
        details: insertError?.details,
      });
      return {
        ok: false,
        status: 500,
        error: "Could not start listing payment.",
        details: insertError?.message,
        code: "listing_payment_insert_failed",
      };
    }
    pendingId = pending.id;
  } else {
    // Prior order is unbound from DB; verify/webhook only accept current razorpay_order_id
    const priorOrderId = existingPending?.razorpay_order_id;
    if (priorOrderId) {
      console.info("[listing-payment] superseding prior order", priorOrderId);
    }
    await admin
      .from("creator_listing_payments")
      .update({
        payer_name: payerName,
        payer_email: payerEmail,
        amount: finalAmountInr,
        original_amount: originalAmountInr,
        discount_amount: discountInr,
        coupon_code: appliedCouponCode,
        razorpay_order_id: null,
      })
      .eq("id", pendingId);
  }

  const receipt = `listing_${pendingId.replace(/-/g, "").slice(0, 24)}`;

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        kind: "listing_payment",
        description: "ViralRank creator listing payment",
        creator_id: creatorId,
        pending_id: pendingId,
        coupon_code: appliedCouponCode ?? "",
        original_amount_inr: String(originalAmountInr),
        final_amount_inr: String(finalAmountInr),
      },
    });

    await admin
      .from("creator_listing_payments")
      .update({ razorpay_order_id: order.id })
      .eq("id", pendingId);

    return {
      ok: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency ?? "INR",
      keyId,
      pendingId,
      creatorName: creator.name,
      username: creator.instagram_username,
      receipt,
      originalAmountInr,
      discountInr,
      finalAmountInr,
    };
  } catch (err) {
    const failure = razorpayErrorResponse(err);
    console.error("[listing-payment] razorpay order failed", {
      statusCode: failure.status,
      code: failure.code,
      details: failure.details,
      creatorId,
      pendingId,
      amountPaise,
    });
    return {
      ok: false,
      status: failure.status,
      error: failure.error,
      details: failure.details,
      code: failure.code,
    };
  }
}

export async function verifyListingPayment(
  admin: SupabaseClient,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    creatorId?: string;
    pendingId?: string;
    paidAmountPaise?: number;
  },
): Promise<ListingVerifyResult> {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    creatorId,
    pendingId,
    paidAmountPaise,
  } = input;

  let paymentRow: {
    id: string;
    creator_id: string;
    is_verified: boolean;
    amount?: number;
    razorpay_order_id?: string | null;
  } | null = null;

  if (pendingId) {
    const { data } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified, razorpay_order_id, amount")
      .eq("id", pendingId)
      .maybeSingle();
    // Only accept the current bound order — rejects orphaned older orders
    if (data && data.razorpay_order_id === razorpayOrderId) {
      paymentRow = data;
    }
  }

  if (!paymentRow) {
    const { data } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified, razorpay_order_id, amount")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();
    paymentRow = data;
  }

  if (!paymentRow) {
    return {
      ok: false,
      status: 404,
      error: "Payment record not found or order was superseded.",
      verified: false,
    };
  }

  if (creatorId && paymentRow.creator_id !== creatorId) {
    return { ok: false, status: 400, error: "Creator mismatch.", verified: false };
  }

  if (typeof paidAmountPaise === "number" && paymentRow.amount != null) {
    const expected = Math.round(Number(paymentRow.amount) * 100);
    if (paidAmountPaise !== expected) {
      console.error("[listing-payment] amount mismatch", {
        paidAmountPaise,
        expected,
        pendingId: paymentRow.id,
      });
      return {
        ok: false,
        status: 400,
        error: "Paid amount does not match the order amount.",
        verified: false,
      };
    }
  }

  return applyVerifiedListingPaymentRpc(admin, {
    creatorId: creatorId ?? paymentRow.creator_id,
    pendingId: paymentRow.id,
    razorpayPaymentId,
    razorpaySignature,
    paidAmountPaise,
  });
}

/** Webhook backup path — resolves pending row by notes or order_id, then auto-publishes. */
export async function processListingPaymentWebhook(
  admin: SupabaseClient,
  razorpay: Razorpay | null,
  payment: ListingWebhookPayment & { amount?: number },
  webhookSignature: string,
): Promise<{ ok: true; duplicate?: boolean; published?: boolean } | { ok: false; error: string }> {
  let notes = payment.notes ?? {};

  if ((!notes.kind || !notes.pending_id) && payment.order_id && razorpay) {
    try {
      const order = await razorpay.orders.fetch(payment.order_id);
      const orderNotes = (order as { notes?: Record<string, string> }).notes ?? {};
      notes = { ...orderNotes, ...notes };
    } catch (err) {
      console.error("[listing-payment] webhook order fetch failed", payment.order_id, err);
    }
  }

  let pendingId = notes.pending_id;
  let creatorId = notes.creator_id;

  // Prefer binding by current razorpay_order_id — ignore superseded orphan orders
  if (payment.order_id) {
    const { data: byOrder } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified, amount, razorpay_order_id")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (byOrder) {
      pendingId = byOrder.id;
      creatorId = byOrder.creator_id;
      if (byOrder.is_verified) {
        return { ok: true, duplicate: true, published: true };
      }
    } else if (pendingId) {
      // Notes point at a pending row but order_id is no longer current → reject
      const { data: byPending } = await admin
        .from("creator_listing_payments")
        .select("razorpay_order_id, is_verified")
        .eq("id", pendingId)
        .maybeSingle();
      if (byPending && byPending.razorpay_order_id && byPending.razorpay_order_id !== payment.order_id) {
        console.error("[listing-payment] webhook ignored superseded order", payment.order_id);
        return { ok: false, error: "Superseded order ignored." };
      }
    }
  }

  if (notes.kind !== "listing_payment" || !pendingId || !creatorId) {
    return { ok: false, error: "Missing listing payment metadata." };
  }

  const result = await applyVerifiedListingPaymentRpc(admin, {
    creatorId,
    pendingId,
    razorpayPaymentId: payment.id,
    razorpaySignature: webhookSignature,
    paidAmountPaise: typeof payment.amount === "number" ? Number(payment.amount) : undefined,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, duplicate: result.duplicate, published: result.published };
}
