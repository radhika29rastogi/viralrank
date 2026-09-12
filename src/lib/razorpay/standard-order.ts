import type Razorpay from "razorpay";
import { publicRazorpayKey } from "@/lib/razorpay/client";
import { razorpayErrorResponse } from "@/lib/razorpay/errors";
import { MAX_STANDARD_ORDER_PAISE, MIN_STANDARD_ORDER_PAISE } from "@/lib/razorpay/constants";

export { MAX_STANDARD_ORDER_PAISE, MIN_STANDARD_ORDER_PAISE };

export async function createStandardRazorpayOrder(
  razorpay: Razorpay,
  input: { amount: number; currency?: string; receipt?: string },
) {
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount < MIN_STANDARD_ORDER_PAISE) {
    return {
      ok: false as const,
      status: 400,
      error: "Amount must be at least 100 paise.",
    };
  }
  if (amount > MAX_STANDARD_ORDER_PAISE) {
    return {
      ok: false as const,
      status: 400,
      error: "Amount exceeds the checkout limit.",
    };
  }

  const keyId = publicRazorpayKey();
  if (!keyId) {
    return { ok: false as const, status: 503, error: "Payments are not configured yet." };
  }

  const currency = input.currency ?? "INR";
  const receipt = input.receipt ?? `rcpt_${Date.now()}`;

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    return {
      ok: true as const,
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency ?? currency,
      key_id: keyId,
      receipt,
    };
  } catch (err) {
    const failure = razorpayErrorResponse(err);
    console.error("[razorpay/standard-order] create failed", failure);
    return {
      ok: false as const,
      status: failure.status,
      error: failure.error,
      details: failure.details,
      code: failure.code,
    };
  }
}
