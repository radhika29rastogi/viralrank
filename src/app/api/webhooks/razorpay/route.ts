import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";

type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  notes?: Record<string, string>;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id) {
    return NextResponse.json({ error: "Missing payment." }, { status: 400 });
  }

  const { data: existingBid } = await admin
    .from("creator_ranking_bids")
    .select("id")
    .eq("razorpay_payment_id", payment.id)
    .maybeSingle();
  const { data: existingHype } = await admin
    .from("creator_hypes")
    .select("id")
    .eq("razorpay_payment_id", payment.id)
    .maybeSingle();

  if (existingBid || existingHype) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const kind = payment.notes?.kind;
  const pendingId = payment.notes?.pending_id;
  const creatorId = payment.notes?.creator_id;

  if (!kind || !pendingId || !creatorId) {
    return NextResponse.json({ error: "Missing payment notes." }, { status: 400 });
  }

  if (kind === "ranking_bid") {
    const { data: row } = await admin
      .from("creator_ranking_bids")
      .select("id, amount, creator_id")
      .eq("id", pendingId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Unknown bid." }, { status: 404 });

    const { data, error } = await admin.rpc("apply_verified_ranking_bid", {
      p_creator_id: row.creator_id,
      p_amount: row.amount,
      p_payment_row_id: row.id,
      p_razorpay_payment_id: payment.id,
      p_razorpay_signature: signature,
    });

    if (error) {
      return NextResponse.json({ error: "Could not apply ranking bid." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: data });
  }

  if (kind === "hype") {
    const { data: row } = await admin
      .from("creator_hypes")
      .select("id, amount, creator_id")
      .eq("id", pendingId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Unknown hype." }, { status: 404 });

    const { data, error } = await admin.rpc("apply_verified_hype", {
      p_creator_id: row.creator_id,
      p_amount: row.amount,
      p_payment_row_id: row.id,
      p_razorpay_payment_id: payment.id,
      p_razorpay_signature: signature,
    });

    if (error) {
      return NextResponse.json({ error: "Could not apply hype." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: data });
  }

  return NextResponse.json({ error: "Unknown payment kind." }, { status: 400 });
}
