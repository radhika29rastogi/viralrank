import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyCheckoutSignature } from "@/lib/razorpay/verify";
import { verifyListingPayment } from "@/lib/razorpay/listing-payment";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: ownedCreator } = await admin
    .from("creators")
    .select("user_id")
    .eq("id", creatorId)
    .maybeSingle();
  if (ownedCreator?.user_id && ownedCreator.user_id !== user.id) {
    return NextResponse.json({ error: "You cannot verify payment for this creator." }, { status: 403 });
  }

  if (
    !verifyCheckoutSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
  ) {
    console.error("[verify-listing] checkout signature invalid", { creatorId, pendingId });
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const result = await verifyListingPayment(admin, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    creatorId,
    pendingId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.info("[verify-listing] creator auto-published", {
    creatorId,
    username: result.username,
    published: result.published,
    duplicate: result.duplicate,
  });

  return NextResponse.json({
    ok: true,
    username: result.username,
    published: result.published,
    duplicate: result.duplicate,
    alreadyVerified: result.alreadyVerified,
  });
}
