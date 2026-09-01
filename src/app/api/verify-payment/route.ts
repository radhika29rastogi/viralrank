import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckoutSignature } from "@/lib/razorpay/verify";
import { verifyListingPayment } from "@/lib/razorpay/listing-payment";

export const runtime = "nodejs";

const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  /** Optional — resolved from order_id when omitted. */
  creator_id: z.uuid().optional(),
  pending_id: z.uuid().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "verify-payment"), 20);
  if (!limited.ok) {
    return NextResponse.json({ success: false, verified: false, error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, verified: false, error: "Not configured." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, verified: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const parsed = verifyPaymentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, verified: false, error: parsed.error.issues[0]?.message ?? "Missing payment fields." },
      { status: 400 },
    );
  }

  const {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature,
    creator_id: creatorId,
    pending_id: pendingId,
  } = parsed.data;

  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    return NextResponse.json(
      { success: false, verified: false, error: "Payment verification failed." },
      { status: 400 },
    );
  }

  const result = await verifyListingPayment(admin, {
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    creatorId,
    pendingId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, verified: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    verified: true,
    username: result.username,
    duplicate: result.duplicate,
    already_verified: result.alreadyVerified,
  });
}
