"use client";

import type { RazorpayCheckoutOptions } from "@/types/razorpay-checkout";

export function loadRazorpayCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout"));
    document.body.appendChild(script);
  });
}

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export async function openRazorpayCheckout(
  options: Omit<RazorpayCheckoutOptions, "handler"> & {
    onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
    onDismiss?: () => void;
    onFailed?: (message: string) => void;
  },
) {
  await loadRazorpayCheckout();

  const { onSuccess, onDismiss, onFailed, ...checkoutOptions } = options;

  return new Promise<void>((resolve) => {
    const rzp = new window.Razorpay({
      ...checkoutOptions,
      handler: async (response) => {
        try {
          await onSuccess(response);
        } finally {
          resolve();
        }
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
          resolve();
        },
      },
    });

    rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
      onFailed?.(response.error?.description ?? "Payment failed.");
      resolve();
    });

    rzp.open();
  });
}
