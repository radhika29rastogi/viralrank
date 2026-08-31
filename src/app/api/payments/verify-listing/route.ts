import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckoutSignature } from "@/lib/razorpay/verify";
import { z } from "zod";

const verifyListingSchema = z.object({
  creatorId: z.uuid(),
  pendingId: z.uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "verify-listing"), 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = verifyListingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payment details." },
      { status: 400 },
    );
  }

  const { creatorId, pendingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    parsed.data;

  if (
    !verifyCheckoutSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
  ) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("creator_listing_payments")
    .select("id, is_verified")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();

  if (existing?.is_verified) {
    const { data: creator } = await admin
      .from("creators")
      .select("instagram_username, status, listing_payment_status")
      .eq("id", creatorId)
      .maybeSingle();
    return NextResponse.json({
      ok: true,
      duplicate: true,
      username: creator?.instagram_username,
      published: creator?.status === "active" && creator?.listing_payment_status === "paid",
    });
  }

  const { data, error } = await admin.rpc("apply_verified_listing_payment", {
    p_creator_id: creatorId,
    p_payment_row_id: pendingId,
    p_razorpay_payment_id: razorpayPaymentId,
    p_razorpay_signature: razorpaySignature,
  });

  if (error) {
    console.error("[verify-listing] rpc failed", error.message);
    return NextResponse.json({ error: "Could not publish this creator." }, { status: 500 });
  }

  const result = data as { ok?: boolean; error?: string; already_verified?: boolean };
  if (!result?.ok) {
    return NextResponse.json({ error: result?.error ?? "Could not publish this creator." }, { status: 400 });
  }

  const { data: creator } = await admin
    .from("creators")
    .select("instagram_username")
    .eq("id", creatorId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    username: creator?.instagram_username,
    alreadyVerified: Boolean(result.already_verified),
  });
}
