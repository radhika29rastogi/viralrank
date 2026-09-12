import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay/client";
import { verifyCheckoutSignature } from "@/lib/razorpay/verify";
import { verifyListingPayment } from "@/lib/razorpay/listing-payment";

export const runtime = "nodejs";

const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  creator_id: z.uuid().optional(),
  pending_id: z.uuid().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "verify-payment"), 20);
  if (!limited.ok) {
    return NextResponse.json({ success: false, verified: false, error: "Too many requests." }, { status: 429 });
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
      {
        success: false,
        verified: false,
        error: parsed.error.issues[0]?.message ?? "Missing payment fields.",
      },
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
    console.error("[verify-payment] signature mismatch", { orderId, paymentId });
    return NextResponse.json(
      { success: false, verified: false, error: "Payment verification failed." },
      { status: 400 },
    );
  }

  if (!creatorId && !pendingId) {
    return NextResponse.json({ success: true, verified: true });
  }

  if (!creatorId || !pendingId) {
    return NextResponse.json(
      { success: false, verified: false, error: "Missing payment fields." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, verified: false, error: "Not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ success: false, verified: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: ownedCreator } = await admin
    .from("creators")
    .select("user_id")
    .eq("id", creatorId)
    .maybeSingle();
  if (!ownedCreator?.user_id || ownedCreator.user_id !== user.id) {
    return NextResponse.json(
      { success: false, verified: false, error: "You cannot verify payment for this creator." },
      { status: 403 },
    );
  }

  // Reconcile paid amount with Razorpay when possible
  let paidAmountPaise: number | undefined;
  const razorpay = getRazorpay();
  if (razorpay) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      paidAmountPaise = Number(payment.amount);
      if (payment.order_id && payment.order_id !== orderId) {
        return NextResponse.json(
          { success: false, verified: false, error: "Payment order mismatch." },
          { status: 400 },
        );
      }
    } catch (err) {
      console.error("[verify-payment] payment fetch failed", err instanceof Error ? err.message : err);
    }
  }

  const result = await verifyListingPayment(admin, {
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    creatorId,
    pendingId,
    paidAmountPaise,
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
    ok: true,
    username: result.username,
    published: result.published,
    duplicate: result.duplicate,
    already_verified: result.alreadyVerified,
  });
}
