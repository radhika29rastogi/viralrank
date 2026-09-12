import type { SupabaseClient } from "@supabase/supabase-js";
import type Razorpay from "razorpay";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { parseInstagramProfileInput } from "@/lib/instagram/username";
import { resolveCategoryId } from "@/lib/supabase/seed-categories";
import { validateHypeAmount } from "@/lib/ranking";
import { getCategoryTopBid, getCreatorVerifiedBid, requiredRankBid } from "@/lib/arena/bids";
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
    const check = validateHypeAmount(input.amountInr ?? 49);
    if (!check.ok) return { ok: false, status: 400, error: check.message };
    requiredAmountInr = 49;
  } else {
    const firstBidFloor = requiredRankBid(creatorBid);
    const claimOne = requiredRankBid(categoryTop);
    requiredAmountInr = existing?.id && creatorBid > 0 ? firstBidFloor : Math.min(firstBidFloor, 199);
    if (input.amountInr != null && input.amountInr >= claimOne) {
      requiredAmountInr = claimOne;
    } else if (existing?.id && creatorBid > 0) {
      requiredAmountInr = firstBidFloor;
    } else {
      requiredAmountInr = 199;
    }
  }

  const amountInr = Math.round(input.amountInr ?? requiredAmountInr);
  if (input.type === "rank_bid" && amountInr < requiredAmountInr) {
    return {
      ok: false,
      status: 400,
      error:
        requiredAmountInr === 199
          ? "First rank bid is ₹199."
          : `This bid must be at least ₹${requiredAmountInr} (current highest + ₹100).`,
    };
  }
  if (input.type === "hype" && amountInr < 49) {
    return { ok: false, status: 400, error: "Minimum hype amount is ₹49." };
  }

  const coupon = input.couponCode?.trim().toUpperCase() || null;
  const editToken = createEditToken();

  try {
    const order = await razorpay.orders.create({
      amount: inrToPaise(amountInr),
      currency: "INR",
      notes: {
        kind: "arena_payment",
        type: input.type,
        handle: parsed.username,
      },
    });

    const { error } = await admin.from("payments").insert({
      creator_id: existing?.id ?? null,
      type: input.type,
      amount: inrToPaise(amountInr),
      amount_inr: amountInr,
      razorpay_order_id: order.id,
      status: "pending",
      coupon_code: coupon,
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
      amountInr,
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
