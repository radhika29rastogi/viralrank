import { NextResponse } from "next/server";
import { z } from "zod";
import { validateListingCoupon, couponSuccessMessage } from "@/lib/coupons/listing";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1).max(32),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "coupon-validate"), 30);
  if (!limited.ok) {
    return NextResponse.json({ valid: false, error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ valid: false, error: "Coupons are not configured yet." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Enter a coupon code." }, { status: 400 });
  }

  const result = await validateListingCoupon(admin, parsed.data.code);
  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      error: result.error || "Invalid or expired coupon code.",
      originalAmountInr: result.originalAmountInr,
      finalAmountInr: result.finalAmountInr,
      amountPaise: result.amountPaise,
    });
  }

  return NextResponse.json({
    valid: true,
    code: result.code,
    discountInr: result.discountInr,
    originalAmountInr: result.originalAmountInr,
    finalAmountInr: result.finalAmountInr,
    amountPaise: result.amountPaise,
    message: couponSuccessMessage(result.code, result.discountInr),
  });
}
