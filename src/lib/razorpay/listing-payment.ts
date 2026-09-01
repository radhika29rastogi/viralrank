import type { SupabaseClient } from "@supabase/supabase-js";
import type Razorpay from "razorpay";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { publicRazorpayKey } from "@/lib/razorpay/client";

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
    }
  | { ok: false; status: number; error: string };

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
  },
): Promise<ListingVerifyResult> {
  const { creatorId, pendingId, razorpayPaymentId, razorpaySignature } = input;

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

  const { data, error } = await admin.rpc("apply_verified_listing_payment", {
    p_creator_id: creatorId,
    p_payment_row_id: pendingId,
    p_razorpay_payment_id: razorpayPaymentId,
    p_razorpay_signature: razorpaySignature,
  });

  if (error) {
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
  input: { creatorId: string; payerName: string; payerEmail: string },
): Promise<ListingOrderResult> {
  const { creatorId, payerName, payerEmail } = input;
  const keyId = publicRazorpayKey();
  if (!keyId) {
    return { ok: false, status: 503, error: "Payments are not configured yet." };
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

  const { data: pending, error: insertError } = await admin
    .from("creator_listing_payments")
    .insert({
      creator_id: creatorId,
      payer_name: payerName,
      payer_email: payerEmail,
      amount: MIN_LISTING_PAYMENT,
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
    return { ok: false, status: 500, error: "Could not start listing payment." };
  }

  const receipt = `listing_${pending.id.replace(/-/g, "").slice(0, 24)}`;
  const amountPaise = MIN_LISTING_PAYMENT * 100;

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        kind: "listing_payment",
        description: "ViralRank creator listing payment",
        creator_id: creatorId,
        pending_id: pending.id,
      },
    });

    await admin
      .from("creator_listing_payments")
      .update({ razorpay_order_id: order.id })
      .eq("id", pending.id);

    return {
      ok: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency ?? "INR",
      keyId,
      pendingId: pending.id,
      creatorName: creator.name,
      username: creator.instagram_username,
      receipt,
    };
  } catch (err) {
    console.error("[listing-payment] razorpay order failed", err);
    return { ok: false, status: 500, error: "Could not create a payment order." };
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
  },
): Promise<ListingVerifyResult> {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, creatorId, pendingId } = input;

  let paymentRow: { id: string; creator_id: string; is_verified: boolean } | null = null;

  if (pendingId) {
    const { data } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified, razorpay_order_id")
      .eq("id", pendingId)
      .maybeSingle();
    if (data && data.razorpay_order_id === razorpayOrderId) {
      paymentRow = data;
    }
  }

  if (!paymentRow) {
    const { data } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();
    paymentRow = data;
  }

  if (!paymentRow) {
    return { ok: false, status: 404, error: "Payment record not found.", verified: false };
  }

  if (creatorId && paymentRow.creator_id !== creatorId) {
    return { ok: false, status: 400, error: "Creator mismatch.", verified: false };
  }

  return applyVerifiedListingPaymentRpc(admin, {
    creatorId: creatorId ?? paymentRow.creator_id,
    pendingId: paymentRow.id,
    razorpayPaymentId,
    razorpaySignature,
  });
}

/** Webhook backup path — resolves pending row by notes or order_id, then auto-publishes. */
export async function processListingPaymentWebhook(
  admin: SupabaseClient,
  razorpay: Razorpay | null,
  payment: ListingWebhookPayment,
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

  if (!pendingId && payment.order_id) {
    const { data: byOrder } = await admin
      .from("creator_listing_payments")
      .select("id, creator_id, is_verified")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (byOrder) {
      pendingId = byOrder.id;
      creatorId = creatorId ?? byOrder.creator_id;
      if (byOrder.is_verified) {
        return { ok: true, duplicate: true, published: true };
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
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, duplicate: result.duplicate, published: result.published };
}
