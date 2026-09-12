/** All arena money is integer INR on the wire; paise only at Razorpay. */

export function inrToPaise(inr: number) {
  return Math.round(inr) * 100;
}

export function paiseToInr(paise: number) {
  return Math.round(paise / 100);
}

export function asPositiveInr(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const inr = Math.round(n);
  return inr > 0 ? inr : null;
}
