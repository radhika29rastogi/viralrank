import type { SupabaseClient } from "@supabase/supabase-js";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";

export const FIRST50_CODE = "FIRST50";
export const FIRST50_DISCOUNT_INR = 50;
export const FIRST50_MAX_USES = 50;
export const DISCOUNTED_LISTING_PAYMENT = MIN_LISTING_PAYMENT - FIRST50_DISCOUNT_INR;

export type ListingCouponRow = {
  code: string;
  discount_inr: number;
  max_uses: number | null;
  use_count: number;
  active: boolean;
};

export type CouponValidationResult =
  | {
      valid: true;
      code: string;
      discountInr: number;
      originalAmountInr: number;
      finalAmountInr: number;
      amountPaise: number;
    }
  | {
      valid: false;
      error: string;
      originalAmountInr: number;
      finalAmountInr: number;
      amountPaise: number;
    };

function normalizeCouponCode(raw: string | null | undefined) {
  return raw?.trim().toUpperCase() ?? "";
}

export async function validateListingCoupon(
  admin: SupabaseClient,
  rawCode: string | null | undefined,
): Promise<CouponValidationResult> {
  const originalAmountInr = MIN_LISTING_PAYMENT;
  const defaultPaise = originalAmountInr * 100;

  const code = normalizeCouponCode(rawCode);
  if (!code) {
    return {
      valid: false,
      error: "",
      originalAmountInr,
      finalAmountInr: originalAmountInr,
      amountPaise: defaultPaise,
    };
  }

  const { data: coupon, error } = await admin
    .from("listing_coupons")
    .select("code, discount_inr, max_uses, use_count, active")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[coupons] lookup failed", error.message);
    return {
      valid: false,
      error: "Coupons are not configured yet.",
      originalAmountInr,
      finalAmountInr: originalAmountInr,
      amountPaise: defaultPaise,
    };
  }

  if (!coupon) {
    return {
      valid: false,
      error: "Invalid or expired coupon code.",
      originalAmountInr,
      finalAmountInr: originalAmountInr,
      amountPaise: defaultPaise,
    };
  }

  const row = coupon as ListingCouponRow;
  if (!row.active) {
    return {
      valid: false,
      error: "Invalid or expired coupon code.",
      originalAmountInr,
      finalAmountInr: originalAmountInr,
      amountPaise: defaultPaise,
    };
  }

  if (row.max_uses != null && row.use_count >= row.max_uses) {
    const endedMessage =
      code === FIRST50_CODE ? "FIRST50 coupon has ended." : "This coupon has reached its usage limit.";
    return {
      valid: false,
      error: endedMessage,
      originalAmountInr,
      finalAmountInr: originalAmountInr,
      amountPaise: defaultPaise,
    };
  }

  const discountInr = Number(row.discount_inr);
  const finalAmountInr = Math.max(originalAmountInr - discountInr, 1);

  return {
    valid: true,
    code: row.code,
    discountInr,
    originalAmountInr,
    finalAmountInr,
    amountPaise: finalAmountInr * 100,
  };
}

export function couponSuccessMessage(code: string, discountInr: number) {
  if (code === FIRST50_CODE) {
    return `FIRST50 applied! You save ₹${discountInr}.`;
  }
  return `${code} applied! You save ₹${discountInr}.`;
}
