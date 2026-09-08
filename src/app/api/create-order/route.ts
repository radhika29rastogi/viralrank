import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, getRazorpayEnvStatus } from "@/lib/razorpay/client";
import { createListingPaymentOrder } from "@/lib/razorpay/listing-payment";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const listingOrderSchema = z.object({
  creatorId: z.uuid(),
  payerName: z.string().trim().min(1).max(80),
  payerEmail: z.email(),
  couponCode: z.string().trim().max(32).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "create-order"), 10);
  if (!limited.ok) {
    return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429 });
  }

  const envStatus = getRazorpayEnvStatus();
  const razorpay = getRazorpay();
  if (!razorpay || !envStatus.configured) {
    return NextResponse.json(
      {
        success: false,
        error: "Payments are not configured yet.",
        ...(process.env.NODE_ENV === "production"
          ? { code: "razorpay_env_invalid" }
          : {
              details: envStatus.issues.join(" "),
              code: "razorpay_env_invalid",
              mode: envStatus.mode,
            }),
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const listingParsed = listingOrderSchema.safeParse(json);
  if (!listingParsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          listingParsed.error.issues[0]?.message ??
          "Invalid request. Send listing fields { creatorId, payerName, payerEmail }.",
        code: "invalid_listing_order",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  const { creatorId, payerName, payerEmail, couponCode } = listingParsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const { data: creator } = await admin
    .from("creators")
    .select("id, user_id")
    .eq("id", creatorId)
    .maybeSingle();
  if (!creator) {
    return NextResponse.json({ success: false, error: "Creator not found." }, { status: 404 });
  }
  // Require ownership — reject null user_id (legacy) for payment creation
  if (!creator.user_id || creator.user_id !== user.id) {
    return NextResponse.json(
      { success: false, error: "You cannot pay for this creator." },
      { status: 403 },
    );
  }

  const result = await createListingPaymentOrder(admin, razorpay, {
    creatorId,
    payerName,
    payerEmail,
    couponCode,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        details: result.details,
        code: result.code,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    order_id: result.orderId,
    amount: result.amount,
    currency: result.currency,
    key_id: result.keyId,
    pending_id: result.pendingId,
    creator_id: creatorId,
    username: result.username,
    listing_amount_inr: result.finalAmountInr,
    original_amount_inr: result.originalAmountInr,
    discount_inr: result.discountInr,
    receipt: result.receipt,
  });
}
