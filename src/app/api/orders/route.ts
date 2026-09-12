import { NextResponse } from "next/server";
import { createArenaOrder } from "@/lib/arena/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getRazorpay, publicRazorpayKey } from "@/lib/razorpay/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { arenaOrderSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "arena-orders"), 8);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const razorpay = getRazorpay();
  const admin = createAdminClient();
  const key = publicRazorpayKey();
  if (!razorpay || !admin || !key) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = arenaOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  const result = await createArenaOrder(admin, razorpay, key, {
    instagramHandle: parsed.data.instagram_handle,
    type: parsed.data.type,
    amountInr: parsed.data.amount,
    category: parsed.data.category,
    couponCode: parsed.data.coupon_code,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    order_id: result.orderId,
    amount: result.amountPaise,
    amount_inr: result.amountInr,
    currency: result.currency,
    key: result.key,
    required_amount_inr: result.requiredAmountInr,
    handle: result.handle,
  });
}
