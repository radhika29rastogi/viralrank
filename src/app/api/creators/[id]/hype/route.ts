import { NextResponse } from "next/server";

/**
 * Free hype is disabled. Hype must go through Razorpay via POST /api/payments/order
 * with kind: "hype", then verified payment RPC.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Free hype is disabled. Support this creator with a paid hype (₹49+).",
      code: "paid_hype_only",
    },
    { status: 403 },
  );
}
