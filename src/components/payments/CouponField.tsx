"use client";

import { useState } from "react";
import { BoldButton } from "@/components/system";
import { Input } from "@/components/ui/input";

export type AppliedCoupon = {
  code: string;
  discountApplied: number;
  amountBefore: number;
  amountAfter: number;
};

export function CouponField({
  amount,
  applied,
  onApplied,
  onCleared,
  disabled = false,
  paymentType = "rank_bid",
}: {
  amount: number;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon) => void;
  onCleared: () => void;
  disabled?: boolean;
  paymentType?: "rank_bid" | "ranking_bid";
}) {
  const [open, setOpen] = useState(Boolean(applied));
  const [code, setCode] = useState(applied?.code ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/coupons/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, amount, payment_type: paymentType }),
      });
      const json = (await res.json()) as {
        error?: string;
        code?: string;
        discount_applied?: number;
        amount_before?: number;
        amount_after?: number;
      };
      if (!res.ok || json.discount_applied == null || !json.code) {
        onCleared();
        setError(json.error || "This code isn't valid.");
        return;
      }
      onApplied({
        code: json.code,
        discountApplied: json.discount_applied,
        amountBefore: json.amount_before ?? amount,
        amountAfter: json.amount_after ?? amount,
      });
    } catch {
      setError("Could not check this code.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-bold text-muted-foreground underline"
        onClick={() => setOpen(true)}
        data-analytics="coupon_expand"
      >
        Have a coupon?
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border-[2px] border-border bg-card p-3">
      {applied ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-foreground">
            −₹{applied.discountApplied.toLocaleString("en-IN")} applied
          </p>
          <button
            type="button"
            className="text-xs font-bold underline text-muted-foreground"
            onClick={() => {
              setCode("");
              onCleared();
            }}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code"
            disabled={disabled || busy}
            className="h-10 border-[2px] border-border bg-input-bg text-sm font-bold uppercase text-input-text"
            autoComplete="off"
          />
          <BoldButton color="yellow" type="button" onClick={() => void apply()} disabled={disabled || busy || !code.trim()}>
            {busy ? "Checking…" : "Apply"}
          </BoldButton>
        </div>
      )}
      {error ? <p className="text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
