import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { instagramProfileUrl } from "@/lib/instagram/username";
import { getCategoryTopBid, getCreatorVerifiedBid, requiredRankBid } from "@/lib/arena/bids";
import { redeemCouponAfterPayment } from "@/lib/arena/coupons";
import { createEditToken } from "@/lib/arena/tokens";
import { MIN_RANKING_BID } from "@/lib/ranking";
import { sendManageReceipt } from "@/lib/arena/email";

async function afterVerifiedScoreChange(admin: SupabaseClient) {
  const { error } = await admin.rpc("sync_live_battle");
  if (error) {
    console.error("[arena/webhook] battle history sync failed", error.message);
  }
  try {
    revalidateTag("listings", "max");
  } catch (error) {
    console.error("[arena/webhook] listing cache revalidate failed", error);
  }
}

type PaymentRow = {
  id: string;
  creator_id: string | null;
  type: "rank_bid" | "hype";
  amount: number;
  amount_inr: number;
  bid_amount: number | null;
  amount_charged: number | null;
  coupon_id: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
  instagram_handle: string;
  category_id: string | null;
  required_amount_inr: number | null;
  edit_token: string | null;
  coupon_code: string | null;
};

function statedBid(pending: PaymentRow) {
  return Math.round(Number(pending.bid_amount || pending.amount_inr || 0));
}

type RazorpayEntity = {
  id: string;
  order_id: string;
  amount: number;
  email?: string;
  contact?: string;
};

export async function applyArenaPayment(
  admin: SupabaseClient,
  payment: RazorpayEntity,
  payload: unknown,
): Promise<{ ok: true; duplicate?: boolean; tookRank?: boolean } | { ok: false; error: string }> {
  const { data: byPayment } = await admin
    .from("payments")
    .select("id, status")
    .eq("razorpay_payment_id", payment.id)
    .maybeSingle();
  if (byPayment?.status === "verified") {
    return { ok: true, duplicate: true };
  }

  const { data: row } = await admin
    .from("payments")
    .select(
      "id, creator_id, type, amount, amount_inr, bid_amount, amount_charged, coupon_id, razorpay_order_id, razorpay_payment_id, status, instagram_handle, category_id, required_amount_inr, edit_token, coupon_code",
    )
    .eq("razorpay_order_id", payment.order_id)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Unknown arena order." };
  }

  const pending = row as PaymentRow;
  if (pending.status === "verified") {
    return { ok: true, duplicate: true };
  }
  if (Number(pending.amount) !== Number(payment.amount)) {
    return { ok: false, error: "Amount mismatch." };
  }

  const handle = pending.instagram_handle.toLowerCase();
  const snapshot = await lookupInstagramProfile(handle);
  if (!snapshot.ok) {
    return { ok: false, error: snapshot.message };
  }

  const payerEmail = payment.email?.trim() || null;
  const payerPhone = payment.contact?.trim() || null;
  const editToken = pending.edit_token || createEditToken();

  const { data: existing } = await admin
    .from("creators")
    .select("id, category_id, edit_token")
    .eq("instagram_username", handle)
    .maybeSingle();

  const creatorFields = {
    instagram_username: handle,
    instagram_url: instagramProfileUrl(handle),
    name: snapshot.profile.displayName,
    bio: snapshot.profile.bio,
    profile_image_url: snapshot.profile.profilePhotoUrl,
    followers: snapshot.profile.followerCount,
    instagram_data_source: "instagram" as const,
    stats_fetched_at: snapshot.profile.fetchedAt,
    location: "Instagram",
    contact_phone: payerPhone,
    category_id: pending.category_id ?? existing?.category_id ?? null,
    status: "active",
    listing_payment_status: "paid",
    published_at: new Date().toISOString(),
    edit_token: existing?.edit_token || editToken,
  };

  let creatorId = existing?.id ?? pending.creator_id;
  if (creatorId) {
    const update: Record<string, unknown> = { ...creatorFields };
    const { error } = await admin.from("creators").update(update).eq("id", creatorId);
    if (error) {
      console.error("[arena/webhook] creator update failed", error.message);
      return { ok: false, error: "Could not update creator." };
    }
  } else {
    const { data: inserted, error } = await admin
      .from("creators")
      .insert({
        ...creatorFields,
        contact_email: payerEmail || "receipt@viralrank.buzz",
        user_id: null,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("[arena/webhook] creator insert failed", error?.message);
      return { ok: false, error: "Could not create creator." };
    }
    creatorId = inserted.id;
  }

  let tookRank: boolean | null = null;
  if (pending.type === "rank_bid") {
    const otherMax = Math.max(
      await getCreatorVerifiedBid(admin, creatorId),
      await getCategoryTopBid(admin, { categoryId: pending.category_id }),
    );
    const stillRequired = requiredRankBid(otherMax);
    const bid = statedBid(pending);
    if (otherMax <= 0) {
      tookRank = bid >= MIN_RANKING_BID;
    } else if (bid < stillRequired) {
      // Another verified bid landed first — keep the money, do not award #1.
      tookRank = bid > otherMax;
    } else {
      tookRank = bid > otherMax;
    }
  }

  const { data: finalized, error: finError } = await admin.rpc("finalize_combined_score_payment", {
    p_payment_id: pending.id,
    p_razorpay_payment_id: payment.id,
    p_creator_id: creatorId,
    p_payer_email: payerEmail,
    p_payer_phone: payerPhone,
    p_edit_token: editToken,
    p_took_rank: tookRank,
    p_payload: payload,
  });

  if (finError) {
    console.error("[arena/webhook] finalize failed", finError.message);
    return { ok: false, error: "Could not verify payment." };
  }

  const fin = (finalized ?? {}) as {
    ok?: boolean;
    duplicate?: boolean;
    error?: string;
    score_applied?: boolean;
  };
  if (fin.duplicate) {
    return { ok: true, duplicate: true };
  }
  if (fin.ok === false) {
    return { ok: false, error: fin.error || "Could not verify payment." };
  }

  await redeemCouponAfterPayment(
    admin,
    pending.id,
    pending.type,
    pending.coupon_id,
    statedBid(pending),
    Math.round(Number(pending.amount_charged || pending.amount_inr || 0)),
  );

  if (payerEmail) {
    await sendManageReceipt({
      to: payerEmail,
      handle,
      token: editToken,
      type: pending.type,
      amountInr: Math.round(Number(pending.amount_charged || pending.amount_inr || 0)),
      bidAmount: statedBid(pending),
      tookRank,
    });
  }

  await afterVerifiedScoreChange(admin);
  return { ok: true, tookRank: tookRank ?? undefined };
}
