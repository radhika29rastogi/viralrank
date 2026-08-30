"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HYPE_PRESETS, minOvertakeAmount, validateHypeAmount, validateRankingBid } from "@/lib/ranking";
import type { PaymentKind } from "@/types/database";

function loadRazorpay() {
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

export function PaymentModal({
  open,
  onOpenChange,
  kind,
  creatorId,
  creatorName,
  currentHighestBid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PaymentKind;
  creatorId: string;
  creatorName: string;
  currentHighestBid: number;
}) {
  const minBid = minOvertakeAmount(currentHighestBid);
  const [amount, setAmount] = useState(kind === "hype" ? 49 : minBid);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "paying" | "verifying" | "done">("idle");

  async function pay() {
    setError("");
    const check =
      kind === "ranking_bid"
        ? validateRankingBid(amount, currentHighestBid)
        : validateHypeAmount(amount);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required so we can record this payment.");
      return;
    }

    setStatus("paying");
    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          creatorId,
          amount,
          supporterName: name,
          supporterEmail: email,
        }),
      });
      const json = (await res.json()) as { error?: string; orderId?: string; key?: string; amount?: number; pendingId?: string };
      if (!res.ok || !json.orderId || !json.key) {
        setError(json.error ?? "Payment could not be completed. Please try again.");
        setStatus("idle");
        return;
      }

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: json.key,
        amount: json.amount ?? amount * 100,
        currency: "INR",
        name: "ViralRank.buzz",
        description: kind === "hype" ? `Hype ${creatorName}` : `Rank ${creatorName}`,
        order_id: json.orderId,
        prefill: { name, email },
        theme: { color: kind === "hype" ? "#FF2D95" : "#F5C518" },
        handler: async () => {
          setStatus("verifying");
          const started = Date.now();
          while (Date.now() - started < 20000) {
            const statusRes = await fetch(
              `/api/payments/status?pendingId=${json.pendingId}&kind=${kind}`,
            );
            const body = (await statusRes.json()) as { status?: string };
            if (body.status === "verified") {
              setStatus("done");
              window.location.reload();
              return;
            }
            if (body.status === "not_applied" || body.status === "failed") {
              setError(
                body.status === "not_applied"
                  ? "We couldn't verify this payment. Your ranking has not been updated."
                  : "Payment could not be completed. Please try again.",
              );
              setStatus("idle");
              return;
            }
            await new Promise((r) => setTimeout(r, 1200));
          }
          setError("We couldn't verify this payment. Your ranking has not been updated.");
          setStatus("idle");
        },
        modal: {
          ondismiss: () => setStatus("idle"),
        },
      });
      rzp.open();
    } catch {
      setError("Payment could not be completed. Please try again.");
      setStatus("idle");
    }
  }

  const isBid = kind === "ranking_bid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto border-4 border-ink bg-cream sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isBid ? `🏆 Beat ₹${minBid}` : "🔥 Hype this creator"}
          </DialogTitle>
          <DialogDescription>
            {isBid
              ? `Pay to take the rank. Minimum to overtake is ₹${minBid}. Rank only updates after webhook verification.`
              : "Hype never changes rank — it is separate community support from ₹49."}
          </DialogDescription>
        </DialogHeader>
        {isBid ? null : (
          <div className="flex flex-wrap gap-2">
            {HYPE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-black ${amount === preset ? "bg-hot-pink text-cream" : "bg-lime"}`}
                onClick={() => setAmount(preset)}
              >
                ₹{preset.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min={isBid ? minBid : 49}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="supporter-name">Your name</Label>
            <Input id="supporter-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="supporter-email">Email</Label>
            <Input id="supporter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
        {status === "verifying" ? (
          <p className="text-sm font-bold">Verifying… rank updates only after payment confirmation.</p>
        ) : null}
        <Button
          variant={isBid ? "bid" : "hype"}
          size="lg"
          className="w-full"
          disabled={status === "paying" || status === "verifying"}
          onClick={pay}
        >
          {isBid ? "Pay ranking bid" : "Send hype"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
