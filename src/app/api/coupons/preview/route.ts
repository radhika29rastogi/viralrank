import { NextResponse } from "next/server";
import { z } from "zod";
import { previewCoupon } from "@/lib/arena/coupons";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  amount: z.coerce.number().int().positive(),
  payment_type: z.enum(["rank_bid", "ranking_bid", "hype"]),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "coupon-preview"), 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Coupons are not configured yet." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a coupon code and amount." }, { status: 400 });
  }

  const result = await previewCoupon(
    admin,
    parsed.data.code,
    parsed.data.amount,
    parsed.data.payment_type,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.coupon.code,
    discount_amount: result.coupon.discount_amount,
    discount_applied: result.discountApplied,
    amount_before: result.amountBefore,
    amount_after: result.amountAfter,
  });
}
