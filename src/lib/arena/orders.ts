import type { SupabaseClient } from "@supabase/supabase-js";
import type Razorpay from "razorpay";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { parseInstagramProfileInput } from "@/lib/instagram/username";
import { resolveCategoryId } from "@/lib/supabase/seed-categories";
import { COUPON_RANK_BID_ONLY, MIN_HYPE_AMOUNT, MIN_RANKING_BID, validateHypeAmount } from "@/lib/ranking";
import { getCategoryTopBid, getCreatorVerifiedBid, requiredRankBid } from "@/lib/arena/bids";
import { previewCoupon } from "@/lib/arena/coupons";
import { inrToPaise } from "@/lib/arena/money";
import { createEditToken } from "@/lib/arena/tokens";

export type ArenaOrderInput = {
  instagramHandle: string;
  type: "rank_bid" | "hype";
  amountInr?: number;
  category?: string;
  couponCode?: string;
};

export type ArenaOrderResult =
  | {
      ok: true;
      orderId: string;
      amountPaise: number;
      amountInr: number;
      bidAmount: number;
      amountCharged: number;
      discountInr: number;
      currency: "INR";
      key: string;
      requiredAmountInr: number;
      handle: string;
    }
  | { ok: false; status: number; error: string };

export async function createArenaOrder(
  admin: SupabaseClient,
  razorpay: Razorpay,
  key: string,
  input: ArenaOrderInput,
): Promise<ArenaOrderResult> {
  const parsed = parseInstagramProfileInput(input.instagramHandle);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.message };
  }

  const profile = await lookupInstagramProfile(parsed.username);
  if (!profile.ok) {
    return { ok: false, status: profile.status, error: profile.message };
  }

  let categoryId: string | null = null;
  if (input.category?.trim()) {
    const resolved = await resolveCategoryId(admin, input.category.trim());
    if ("error" in resolved) {
      return { ok: false, status: 400, error: resolved.error };
    }
    categoryId = resolved.id;
  }

  const { data: existing } = await admin
    .from("creators")
    .select("id, category_id, current_rank_bid, current_highest_bid")
    .eq("instagram_username", parsed.username)
    .maybeSingle();

  const creatorCategoryId = existing?.category_id ?? categoryId;
  const creatorBid = existing?.id ? await getCreatorVerifiedBid(admin, existing.id) : 0;
  const categoryTop = await getCategoryTopBid(admin, { categoryId: creatorCategoryId });

  if (input.type === "hype" && !existing?.id) {
    return {
      ok: false,
      status: 400,
      error: "Hype is only available after a creator is already listed.",
    };
  }

  let requiredAmountInr: number;
  if (input.type === "hype") {
    const check = validateHypeAmount(input.amountInr ?? MIN_HYPE_AMOUNT);
    if (!check.ok) return { ok: false, status: 400, error: check.message };
    requiredAmountInr = MIN_HYPE_AMOUNT;
  } else {
    const firstBidFloor = requiredRankBid(creatorBid);
    const claimOne = requiredRankBid(categoryTop);
    requiredAmountInr =
      existing?.id && creatorBid > 0 ? firstBidFloor : Math.min(firstBidFloor, MIN_RANKING_BID);
    if (input.amountInr != null && input.amountInr >= claimOne) {
      requiredAmountInr = claimOne;
    } else if (existing?.id && creatorBid > 0) {
      requiredAmountInr = firstBidFloor;
    } else {
      requiredAmountInr = MIN_RANKING_BID;
    }
  }

  const amountInr = Math.round(input.amountInr ?? requiredAmountInr);
  if (input.type === "rank_bid" && amountInr < requiredAmountInr) {
    return {
      ok: false,
      status: 400,
      error:
        requiredAmountInr === MIN_RANKING_BID
          ? `First rank bid is ₹${MIN_RANKING_BID.toLocaleString("en-IN")}.`
          : `This bid must be at least ₹${requiredAmountInr} (current highest + ₹100).`,
    };
  }
  if (input.type === "hype" && amountInr < MIN_HYPE_AMOUNT) {
    return {
      ok: false,
      status: 400,
      error: `Minimum hype amount is ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")}.`,
    };
  }

  const bidAmount = amountInr;
  let amountCharged = bidAmount;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let discountInr = 0;

  if (input.couponCode?.trim()) {
    if (input.type !== "rank_bid") {
      return { ok: false, status: 400, error: COUPON_RANK_BID_ONLY };
    }
    const preview = await previewCoupon(admin, input.couponCode, bidAmount, input.type);
    if (!preview.ok) {
      return { ok: false, status: 400, error: preview.error };
    }
    couponId = preview.coupon.id;
    couponCode = preview.coupon.code;
    amountCharged = preview.amountAfter;
    discountInr = preview.discountApplied;
  }

  const editToken = createEditToken();

  try {
    const order = await razorpay.orders.create({
      amount: inrToPaise(amountCharged),
      currency: "INR",
      notes: {
        kind: "arena_payment",
        type: input.type,
        handle: parsed.username,
        bid_amount: String(bidAmount),
        amount_charged: String(amountCharged),
      },
    });

    const { error } = await admin.from("payments").insert({
      creator_id: existing?.id ?? null,
      type: input.type,
      amount: inrToPaise(amountCharged),
      amount_inr: bidAmount,
      bid_amount: bidAmount,
      amount_charged: amountCharged,
      coupon_id: couponId,
      razorpay_order_id: order.id,
      status: "pending",
      coupon_code: couponCode,
      edit_token: editToken,
      instagram_handle: parsed.username,
      category_id: creatorCategoryId,
      required_amount_inr: requiredAmountInr,
    });

    if (error) {
      console.error("[arena/orders] insert failed", error.message);
      return { ok: false, status: 500, error: "Could not start this payment." };
    }

    return {
      ok: true,
      orderId: order.id,
      amountPaise: Number(order.amount),
      amountInr: amountCharged,
      bidAmount,
      amountCharged,
      discountInr,
      currency: "INR",
      key,
      requiredAmountInr,
      handle: parsed.username,
    };
  } catch (err) {
    console.error("[arena/orders] razorpay failed", err instanceof Error ? err.message : err);
    return { ok: false, status: 500, error: "Could not create a payment order." };
  }
}
