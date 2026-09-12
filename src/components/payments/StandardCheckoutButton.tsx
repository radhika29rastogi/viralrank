"use client";

import { useState } from "react";
import { CreditCardIcon } from "@heroicons/react/24/solid";
import { BoldButton } from "@/components/system";
import { RAZORPAY_CHECKOUT_THEME } from "@/lib/design";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout-client";
import { MIN_STANDARD_ORDER_PAISE } from "@/lib/razorpay/constants";

type CheckoutStatus = "idle" | "preparing" | "checkout" | "verifying" | "success" | "cancelled" | "failed";

export function StandardCheckoutButton({
  amountPaise,
  currency = "INR",
  description = "ViralRank payment",
  label,
}: {
  amountPaise: number;
  currency?: string;
  description?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [message, setMessage] = useState("");

  async function pay() {
    setMessage("");
    if (!Number.isFinite(amountPaise) || amountPaise < MIN_STANDARD_ORDER_PAISE) {
      setStatus("failed");
      setMessage("Amount must be at least 100 paise (₹1).");
      return;
    }

    setStatus("preparing");
    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amountPaise),
          currency,
          receipt: `std_${Date.now()}`,
        }),
      });
      const orderJson = (await orderRes.json()) as {
        success?: boolean;
        error?: string;
        details?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        key_id?: string;
      };

      if (!orderRes.ok || !orderJson.success || !orderJson.order_id || !orderJson.key_id) {
        setStatus("failed");
        setMessage(
          orderJson.details
            ? `${orderJson.error ?? "Could not create a payment order."} ${orderJson.details}`
            : (orderJson.error ?? "Could not create a payment order."),
        );
        return;
      }

      setStatus("checkout");
      await openRazorpayCheckout({
        key: orderJson.key_id,
        amount: orderJson.amount ?? amountPaise,
        currency: orderJson.currency ?? currency,
        name: "ViralRank.buzz",
        description,
        order_id: orderJson.order_id,
        theme: { color: RAZORPAY_CHECKOUT_THEME },
        onSuccess: async (response) => {
          setStatus("verifying");
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyJson = (await verifyRes.json()) as {
            success?: boolean;
            verified?: boolean;
            error?: string;
          };
          if (!verifyRes.ok || !verifyJson.success || !verifyJson.verified) {
            setStatus("failed");
            setMessage(verifyJson.error ?? "Payment verification failed.");
            return;
          }
          setStatus("success");
          setMessage("Payment verified.");
        },
        onDismiss: () => {
          setStatus("cancelled");
          setMessage("Payment cancelled.");
        },
        onFailed: (errorMessage) => {
          setStatus("failed");
          setMessage(errorMessage || "Payment failed.");
        },
      });
    } catch {
      setStatus("failed");
      setMessage("Payment could not be completed.");
    }
  }

  const busy = status === "preparing" || status === "checkout" || status === "verifying";
  const buttonLabel =
    status === "preparing"
      ? "Preparing payment..."
      : status === "checkout"
        ? "Complete payment..."
        : status === "verifying"
          ? "Verifying payment..."
          : (label ?? `Pay ₹${(amountPaise / 100).toLocaleString("en-IN")}`);

  return (
    <div className="space-y-3" data-analytics="standard_checkout">
      <BoldButton
        color="yellow"
        size="lg"
        fullWidth
        disabled={busy}
        icon={<CreditCardIcon className="size-5" />}
        onClick={() => void pay()}
      >
        {buttonLabel}
      </BoldButton>
      {message ? (
        <p
          className={`text-sm font-bold ${status === "success" ? "text-ink" : "text-rose-700"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
