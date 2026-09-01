import { NextResponse } from "next/server";
import { z } from "zod";
import { MIN_LISTING_PAYMENT } from "@/lib/creators/public";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, publicRazorpayKey } from "@/lib/razorpay/client";
import { createListingPaymentOrder } from "@/lib/razorpay/listing-payment";

export const runtime = "nodejs";

const MIN_AMOUNT_PAISE = 100;

const createOrderSchema = z.object({
  /** Listing payment (default): requires creatorId + payer details. Amount is fixed server-side. */
  kind: z.literal("listing_payment").optional(),
  creatorId: z.uuid(),
  payerName: z.string().trim().min(1).max(80),
  payerEmail: z.email(),
  /** Ignored for listing — server enforces ₹199 minimum listing fee. */
  amount: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "create-order"), 10);
  if (!limited.ok) {
    return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429 });
  }

  const razorpay = getRazorpay();
  const admin = createAdminClient();
  if (!razorpay || !admin || !publicRazorpayKey()) {
    return NextResponse.json(
      { success: false, error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  if (parsed.data.amount != null && parsed.data.amount < MIN_AMOUNT_PAISE) {
    return NextResponse.json(
      { success: false, error: "Amount must be at least 100 paise." },
      { status: 400 },
    );
  }

  const result = await createListingPaymentOrder(admin, razorpay, {
    creatorId: parsed.data.creatorId,
    payerName: parsed.data.payerName,
    payerEmail: parsed.data.payerEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    order_id: result.orderId,
    amount: result.amount,
    currency: result.currency,
    key_id: result.keyId,
    /** Listing flow metadata (safe for client). */
    pending_id: result.pendingId,
    creator_id: parsed.data.creatorId,
    username: result.username,
    listing_amount_inr: MIN_LISTING_PAYMENT,
    receipt: result.receipt,
  });
}
