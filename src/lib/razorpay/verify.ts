import crypto from "crypto";

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const payload = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
