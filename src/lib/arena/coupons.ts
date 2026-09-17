import type { SupabaseClient } from "@supabase/supabase-js";
import { COUPON_RANK_BID_ONLY, MIN_COUPON_CHARGE } from "@/lib/ranking";

export type CouponRow = {
  id: string;
  code: string;
  discount_amount: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
};

export type CouponPreview =
  | {
      ok: true;
      coupon: CouponRow;
      amountBefore: number;
      amountAfter: number;
      discountApplied: number;
    }
  | { ok: false; error: string };

function normalizeCode(raw: string | null | undefined) {
  return raw?.trim().toUpperCase() ?? "";
}

export function chargeAfterDiscount(amountBefore: number, discountAmount: number) {
  const before = Math.round(amountBefore);
  const discount = Math.max(0, Math.round(discountAmount));
  return Math.max(MIN_COUPON_CHARGE, before - discount);
}

export function isRankBidPaymentType(type: string | null | undefined) {
  return type === "rank_bid" || type === "ranking_bid";
}

export async function previewCoupon(
  admin: SupabaseClient,
  rawCode: string | null | undefined,
  amountBefore: number,
  paymentType: string | null | undefined = "rank_bid",
): Promise<CouponPreview> {
  if (!isRankBidPaymentType(paymentType)) {
    return { ok: false, error: COUPON_RANK_BID_ONLY };
  }
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const stated = Math.round(amountBefore);
  if (!Number.isFinite(stated) || stated < 1) {
    return { ok: false, error: "Enter a valid amount first." };
  }

  const { data, error } = await admin
    .from("coupons")
    .select("id, code, discount_amount, max_uses, used_count, is_active, expires_at")
    .ilike("code", code)
    .maybeSingle();

  if (error) {
    console.error("[coupons] preview failed", error.message);
    return { ok: false, error: "Could not check this code." };
  }

  const coupon = data as CouponRow | null;
  if (!coupon || normalizeCode(coupon.code) !== code) {
    return { ok: false, error: "This code isn't valid." };
  }
  if (!coupon.is_active) {
    return { ok: false, error: "This code isn't valid." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "This code has expired." };
  }
  if (coupon.used_count >= coupon.max_uses) {
    return { ok: false, error: "This code has no remaining uses." };
  }

  const amountAfter = chargeAfterDiscount(stated, coupon.discount_amount);
  const discountApplied = stated - amountAfter;
  if (discountApplied <= 0) {
    return { ok: false, error: "This code doesn't change the amount." };
  }

  return {
    ok: true,
    coupon,
    amountBefore: stated,
    amountAfter,
    discountApplied,
  };
}

export async function redeemCouponAfterPayment(
  admin: SupabaseClient,
  paymentId: string,
  type: "rank_bid" | "hype",
  couponId: string | null,
  amountBefore: number,
  amountAfter: number,
) {
  if (type !== "rank_bid" || !couponId) return;
  const incremented = await admin.rpc("try_increment_coupon_use", { p_coupon_id: couponId });
  if (incremented.error) {
    console.error("[coupons] increment failed", incremented.error.message);
  }
  const redemption = {
    coupon_id: couponId,
    ranking_bid_id: paymentId,
    hype_id: null,
    amount_before: amountBefore,
    amount_after: amountAfter,
  };
  const { error } = await admin.from("coupon_redemptions").insert(redemption);
  if (error) {
    console.error("[coupons] redemption insert failed", error.message);
  }
}
