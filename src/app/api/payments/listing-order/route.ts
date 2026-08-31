import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, publicRazorpayKey } from "@/lib/razorpay/client";
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

  const { data: creator } = await admin
    .from("creators")
    .select("id, name, instagram_username, status, listing_payment_status")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (creator.listing_payment_status === "paid" && creator.status === "active") {
    return NextResponse.json({ error: "This creator is already published." }, { status: 409 });
  }

  const { data: pending, error: insertError } = await admin
    .from("creator_listing_payments")
    .insert({
      creator_id: creatorId,
      payer_name: payerName,
      payer_email: payerEmail,
      amount: MIN_LISTING_PAYMENT,
      currency: "INR",
      payment_status: "pending",
      is_verified: false,
    })
    .select("id")
    .single();

  if (insertError || !pending) {
    return NextResponse.json({ error: "Could not start listing payment." }, { status: 500 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: MIN_LISTING_PAYMENT * 100,
      currency: "INR",
      notes: {
        kind: "listing_payment",
        creator_id: creatorId,
        pending_id: pending.id,
      },
    });

    await admin
      .from("creator_listing_payments")
      .update({ razorpay_order_id: order.id })
      .eq("id", pending.id);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: publicRazorpayKey(),
      pendingId: pending.id,
      creatorName: creator.name,
      username: creator.instagram_username,
    });
  } catch {
    return NextResponse.json({ error: "Could not create a payment order." }, { status: 500 });
  }
}
