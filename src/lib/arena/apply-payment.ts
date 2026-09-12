import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { instagramProfileUrl } from "@/lib/instagram/username";
import { getCategoryTopBid, getCreatorVerifiedBid, requiredRankBid } from "@/lib/arena/bids";
import { createEditToken } from "@/lib/arena/tokens";
import { sendManageReceipt } from "@/lib/arena/email";

type PaymentRow = {
  id: string;
  creator_id: string | null;
  type: "rank_bid" | "hype";
  amount: number;
  amount_inr: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
  instagram_handle: string;
  category_id: string | null;
  required_amount_inr: number | null;
  edit_token: string | null;
  coupon_code: string | null;
};

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
      "id, creator_id, type, amount, amount_inr, razorpay_order_id, razorpay_payment_id, status, instagram_handle, category_id, required_amount_inr, edit_token, coupon_code",
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
    .select("id, category_id, hype_count, total_hype_amount, edit_token")
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
        current_rank_bid: pending.type === "rank_bid" ? pending.amount_inr : 0,
        current_highest_bid: pending.type === "rank_bid" ? pending.amount_inr : 0,
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
    if (otherMax <= 0) {
      tookRank = pending.amount_inr >= 199;
    } else if (pending.amount_inr < stillRequired) {
      // Another verified bid landed first — keep the money, do not award #1.
      tookRank = pending.amount_inr > otherMax;
    } else {
      tookRank = pending.amount_inr > otherMax;
    }
  }

  if (pending.type === "hype") {
    await admin
      .from("creators")
      .update({
        hype_count: Number(existing?.hype_count || 0) + 1,
        total_hype_amount: Number(existing?.total_hype_amount || 0) + pending.amount_inr,
      })
      .eq("id", creatorId);
  }

  const { error: payError } = await admin
    .from("payments")
    .update({
      status: "verified",
      razorpay_payment_id: payment.id,
      creator_id: creatorId,
      payer_email: payerEmail,
      payer_phone: payerPhone,
      edit_token: editToken,
      took_rank: tookRank,
      webhook_payload: payload,
    })
    .eq("id", pending.id)
    .eq("status", "pending");

  if (payError) {
    const { data: raced } = await admin
      .from("payments")
      .select("status")
      .eq("razorpay_payment_id", payment.id)
      .maybeSingle();
    if (raced?.status === "verified") return { ok: true, duplicate: true };
    console.error("[arena/webhook] payment update failed", payError.message);
    return { ok: false, error: "Could not verify payment." };
  }

  const { error: rpcError } = await admin.rpc("recompute_pay_to_rank");
  if (rpcError) {
    console.error("[arena/webhook] recompute failed", rpcError.message);
  }

  if (payerEmail) {
    await sendManageReceipt({
      to: payerEmail,
      handle,
      token: editToken,
      type: pending.type,
      amountInr: pending.amount_inr,
      tookRank,
    });
  }

  return { ok: true, tookRank: tookRank ?? undefined };
}
