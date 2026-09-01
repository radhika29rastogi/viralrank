import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, publicRazorpayKey } from "@/lib/razorpay/client";
import { createClient } from "@/lib/supabase/server";
import { createListingPaymentOrder } from "@/lib/razorpay/listing-payment";
import { z } from "zod";

const listingOrderSchema = z.object({
  creatorId: z.uuid(),
  payerName: z.string().trim().min(1).max(80),
  payerEmail: z.email(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "listing-order"), 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const razorpay = getRazorpay();
  const admin = createAdminClient();
  if (!razorpay || !admin || !publicRazorpayKey()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = listingOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  const { creatorId, payerName, payerEmail } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: creator } = await admin
    .from("creators")
    .select("id, user_id, status, listing_payment_status")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (creator.user_id && creator.user_id !== user.id) {
    return NextResponse.json({ error: "You cannot pay for this creator." }, { status: 403 });
  }

  const result = await createListingPaymentOrder(admin, razorpay, {
    creatorId,
    payerName,
    payerEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    orderId: result.orderId,
    amount: result.amount,
    currency: result.currency,
    key: result.keyId,
    pendingId: result.pendingId,
    creatorName: result.creatorName,
    username: result.username,
  });
}
