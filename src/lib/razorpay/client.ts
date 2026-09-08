import Razorpay from "razorpay";

export type RazorpayEnvStatus = {
  configured: boolean;
  keyIdSet: boolean;
  keySecretSet: boolean;
  publicKeySet: boolean;
  keysMatch: boolean;
  mode: "test" | "live" | "unknown";
  issues: string[];
};

export function getRazorpayEnvStatus(): RazorpayEnvStatus {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? "";

  const issues: string[] = [];
  if (!keyId) issues.push("RAZORPAY_KEY_ID is missing.");
  if (!keySecret) issues.push("RAZORPAY_KEY_SECRET is missing.");
  if (!publicKey) issues.push("NEXT_PUBLIC_RAZORPAY_KEY_ID is missing.");
  if (keyId && publicKey && keyId !== publicKey) {
    issues.push("RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID must match.");
  }

  const mode = keyId.startsWith("rzp_live_")
    ? "live"
    : keyId.startsWith("rzp_test_")
      ? "test"
      : "unknown";

  if (keySecret && mode === "test" && keySecret.length < 20) {
    issues.push("RAZORPAY_KEY_SECRET looks too short for a test key secret.");
  }

  return {
    configured: Boolean(keyId && keySecret && publicKey && keyId === publicKey),
    keyIdSet: Boolean(keyId),
    keySecretSet: Boolean(keySecret),
    publicKeySet: Boolean(publicKey),
    keysMatch: Boolean(keyId && publicKey && keyId === publicKey),
    mode,
    issues,
  };
}

export function getRazorpay() {
  const status = getRazorpayEnvStatus();
  if (!status.keyIdSet || !status.keySecretSet) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET!.trim(),
  });
}

export function publicRazorpayKey() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || "";
}
