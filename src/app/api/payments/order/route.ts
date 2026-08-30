import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRazorpay, publicRazorpayKey } from "@/lib/razorpay/client";
import { validateHypeAmount, validateRankingBid } from "@/lib/ranking";
import { paymentOrderSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "pay-order"), 12);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const razorpay = getRazorpay();
  const admin = createAdminClient();
  if (!razorpay || !admin || !publicRazorpayKey()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = paymentOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  const { kind, creatorId, amount, supporterName, supporterEmail } = parsed.data;

  const { data: creator } = await admin
    .from("creators")
    .select("id, name, current_highest_bid, instagram_username")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (kind === "ranking_bid") {
    const check = validateRankingBid(amount, Number(creator.current_highest_bid) || 0);
    if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
  } else {
    const check = validateHypeAmount(amount);
    if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const table = kind === "ranking_bid" ? "creator_ranking_bids" : "creator_hypes";
  const { data: pending, error: insertError } = await admin
    .from(table)
    .insert({
      creator_id: creatorId,
      supporter_user_id: user?.id ?? null,
      supporter_name: supporterName,
      supporter_email: supporterEmail,
      amount,
      currency: "INR",
      payment_status: "pending",
      is_verified: false,
    })
    .select("id")
    .single();

  if (insertError || !pending) {
    return NextResponse.json({ error: "Could not start this payment." }, { status: 500 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      notes: {
        kind,
        creator_id: creatorId,
        pending_id: pending.id,
      },
    });

    await admin.from(table).update({ razorpay_order_id: order.id }).eq("id", pending.id);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: publicRazorpayKey(),
      pendingId: pending.id,
      creatorName: creator.name,
    });
  } catch {
    return NextResponse.json({ error: "Could not create a payment order." }, { status: 500 });
  }
}
