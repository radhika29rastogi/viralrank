"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AmountInput, amountIsValid } from "@/components/payments/AmountInput";
import { CouponField, type AppliedCoupon } from "@/components/payments/CouponField";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout-client";
import { RAZORPAY_CHECKOUT_THEME } from "@/lib/design";
import {
  HYPE_RANK_COPY,
  MIN_HYPE,
  bidNeededForRank,
  minOvertakeAmount,
  validateHypeAmount,
  validateRankingBid,
} from "@/lib/ranking";
import type { PaymentKind } from "@/types/database";

export function PaymentModal({
  open,
  onOpenChange,
  kind,
  creatorName,
  instagramHandle,
  currentHighestBid,
  totalHypeAmount = 0,
  rivalCombinedScore,
  targetRank,
  suggestedAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PaymentKind;
  creatorId: string;
  creatorName: string;
  instagramHandle?: string;
  currentHighestBid: number;
  totalHypeAmount?: number;
  rivalCombinedScore?: number | null;
  targetRank?: number | null;
  suggestedAmount?: number;
}) {
  const isBid = kind === "ranking_bid";
  const minAmount = isBid ? minOvertakeAmount(currentHighestBid) : MIN_HYPE;
  const takeRank = targetRank && targetRank > 0 ? targetRank : 1;
  const rival = Number(rivalCombinedScore ?? currentHighestBid + totalHypeAmount);
  const beat = isBid
    ? (suggestedAmount ?? bidNeededForRank(currentHighestBid, totalHypeAmount, rival))
    : minAmount;
  const [amount, setAmount] = useState<number | "">(beat);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "paying" | "verifying" | "done">("idle");

  useEffect(() => {
    if (open) {
      setAmount(beat);
      setCoupon(null);
      setError("");
      setStatus("idle");
    }
  }, [open, beat]);

  const valid = amountIsValid(amount, minAmount);
  const typed = typeof amount === "number" ? amount : beat;
  const charge = coupon && coupon.amountBefore === typed ? coupon.amountAfter : typed;

  async function pay() {
    setError("");
    if (!instagramHandle) {
      setError("Missing Instagram handle.");
      return;
    }
    const check = isBid ? validateRankingBid(typed, currentHighestBid) : validateHypeAmount(typed);
    if (!check.ok) {
      setError(check.message);
      return;
    }

    setStatus("paying");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instagram_handle: instagramHandle,
          type: isBid ? "rank_bid" : "hype",
          amount: typed,
          coupon_code: isBid ? coupon?.code : undefined,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        order_id?: string;
        key?: string;
        amount?: number;
        amount_charged?: number;
      };
      if (!res.ok || !json.order_id || !json.key) {
        setError(json.error ?? "Payment could not be completed. Please try again.");
        setStatus("idle");
        return;
      }
      await openRazorpayCheckout({
        key: json.key,
        amount: json.amount ?? charge * 100,
        currency: "INR",
        order_id: json.order_id,
        name: "ViralRank.buzz",
        description: isBid ? `Rank bid ${creatorName}` : `Hype ${creatorName}`,
        theme: { color: RAZORPAY_CHECKOUT_THEME },
        prefill: {},
        onSuccess: async () => {
          setStatus("verifying");
          const started = Date.now();
          while (Date.now() - started < 20000) {
            const statusRes = await fetch(`/api/payments/${json.order_id}/status`);
            const body = (await statusRes.json()) as { status?: string };
            if (body.status === "verified") {
              setStatus("done");
              window.location.reload();
              return;
            }
            if (body.status === "failed") {
              setError("Payment could not be completed. Please try again.");
              setStatus("idle");
              return;
            }
            await new Promise((r) => setTimeout(r, 1200));
          }
          setError("We couldn't verify this payment. Your ranking has not been updated.");
          setStatus("idle");
        },
        onDismiss: () => setStatus("idle"),
        onFailed: (message) => {
          setError(message);
          setStatus("idle");
        },
      });
    } catch {
      setError("Payment could not be completed. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto border-4 border-border bg-cream sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isBid ? `🏆 Beat ₹${beat.toLocaleString("en-IN")} to take #${takeRank}` : "🔥 Hype this creator"}
          </DialogTitle>
          <DialogDescription>
            {isBid
              ? `Minimum next bid: ₹${minAmount.toLocaleString("en-IN")}. To reach #${takeRank}, you need a combined score above ₹${rival.toLocaleString("en-IN")}. Rank only updates after webhook verification.`
              : HYPE_RANK_COPY}
          </DialogDescription>
        </DialogHeader>
        <AmountInput
          minAmount={minAmount}
          suggestedAmount={beat}
          value={amount}
          onChange={(next) => {
            setAmount(next);
            setCoupon(null);
          }}
        />
        {valid && isBid ? (
          <CouponField
            amount={typed}
            applied={coupon}
            onApplied={setCoupon}
            onCleared={() => setCoupon(null)}
            disabled={status === "paying" || status === "verifying"}
            paymentType="rank_bid"
          />
        ) : null}
        {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
        {status === "verifying" ? (
          <p className="text-sm font-bold">Verifying… rank updates only after payment confirmation.</p>
        ) : null}
        <Button
          variant={isBid ? "bid" : "hype"}
          size="lg"
          className="w-full"
          disabled={!valid || status === "paying" || status === "verifying"}
          onClick={() => void pay()}
        >
          Pay ₹{charge.toLocaleString("en-IN")} · no account needed
        </Button>
      </DialogContent>
    </Dialog>
  );
}
