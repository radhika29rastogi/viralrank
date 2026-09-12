"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BoldButton, ColorBlock } from "@/components/system";
import { SmartImage } from "@/components/media/SmartImage";
import { Input } from "@/components/ui/input";
import { ARENA_CATEGORY_TABS } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { MIN_HYPE, MIN_RANKING_BID } from "@/lib/ranking";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout-client";
import { RAZORPAY_CHECKOUT_THEME } from "@/lib/design";
import type { InstagramProfileSnapshot } from "@/lib/instagram/types";

type PayState = "idle" | "preparing" | "checkout" | "verifying" | "success" | "failed";

export function ArenaSubmitForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [handle, setHandle] = useState(search.get("handle") ?? "");
  const [category, setCategory] = useState(search.get("category") || "memes");
  const [profile, setProfile] = useState<InstagramProfileSnapshot | null>(null);
  const [listed, setListed] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [type, setType] = useState<"rank_bid" | "hype">("rank_bid");
  const [amount, setAmount] = useState(Number(search.get("amount")) || MIN_RANKING_BID);
  const [payState, setPayState] = useState<PayState>("idle");
  const [statusNote, setStatusNote] = useState("");

  const payType = listed ? type : "rank_bid";
  const minAmount = payType === "hype" ? MIN_HYPE : MIN_RANKING_BID;
  const displayAmount = useMemo(() => Math.max(amount, minAmount), [amount, minAmount]);

  useEffect(() => {
    if (search.get("handle")) {
      void lookup(search.get("handle") || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(raw = handle) {
    setLooking(true);
    setLookupError("");
    setProfile(null);
    setListed(false);
    try {
      const res = await fetch("/api/instagram/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: raw }),
      });
      const json = (await res.json()) as {
        profile?: InstagramProfileSnapshot;
        listed?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.profile) {
        setLookupError(json.message || json.error || "Something went wrong fetching this profile");
        return;
      }
      const alreadyListed = Boolean(json.listed);
      setProfile(json.profile);
      setHandle(json.profile.handle);
      setListed(alreadyListed);
      if (alreadyListed && search.get("intent") === "hype") {
        setType("hype");
        setAmount(MIN_HYPE);
      } else {
        setType("rank_bid");
        setAmount(Number(search.get("amount")) || MIN_RANKING_BID);
      }
    } catch {
      setLookupError("Something went wrong fetching this profile");
    } finally {
      setLooking(false);
    }
  }

  async function pollStatus(orderId: string) {
    const started = Date.now();
    while (Date.now() - started < 45000) {
      const res = await fetch(`/api/payments/${orderId}/status`);
      const json = (await res.json()) as {
        status?: string;
        handle?: string;
        took_rank?: boolean;
        manage_token?: string;
      };
      if (json.status === "verified") {
        setPayState("success");
        setStatusNote(
          json.took_rank === false
            ? "Payment confirmed. Another bid landed first — this payment is verified and non-refundable."
            : "Payment confirmed, you're live!",
        );
        router.push(json.handle ? `/creator/${json.handle}` : "/rankings");
        return;
      }
      if (json.status === "failed") {
        setPayState("failed");
        setStatusNote("Payment failed.");
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPayState("failed");
    setStatusNote("Still waiting on confirmation. Refresh rankings in a minute — we only go live after the webhook.");
  }

  async function checkout() {
    if (!profile) return;
    setPayState("preparing");
    setStatusNote("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instagram_handle: profile.handle,
          type: payType,
          amount: displayAmount,
          category,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        order_id?: string;
        amount?: number;
        key?: string;
        required_amount_inr?: number;
      };
      if (!res.ok || !json.order_id || !json.key) {
        setPayState("failed");
        setStatusNote(json.error || "Could not start checkout.");
        return;
      }
      setPayState("checkout");
      await openRazorpayCheckout({
        key: json.key,
        amount: json.amount ?? 0,
        currency: "INR",
        order_id: json.order_id,
        name: "ViralRank.buzz",
        description: payType === "hype" ? `Hype @${profile.handle}` : `Rank bid @${profile.handle}`,
        theme: { color: RAZORPAY_CHECKOUT_THEME },
        prefill: {},
        onSuccess: async () => {
          setPayState("verifying");
          await pollStatus(json.order_id!);
        },
        onDismiss: () => {
          setPayState("idle");
          setStatusNote("Checkout closed before payment.");
        },
        onFailed: (message) => {
          setPayState("failed");
          setStatusNote(message);
        },
      });
    } catch {
      setPayState("failed");
      setStatusNote("Could not open checkout.");
    }
  }

  return (
    <div className="space-y-6" data-analytics="arena_submit">
      <ColorBlock color="cream" padding="lg" className="space-y-4">
        <label className="block text-sm font-extrabold">Instagram URL or @username</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="https://instagram.com/handle or @handle"
            className="border-[3px] border-border"
          />
          <BoldButton color="yellow" onClick={() => void lookup()} disabled={looking}>
            {looking ? "Fetching…" : "Fetch profile"}
          </BoldButton>
        </div>
        {lookupError ? <p className="text-sm font-bold text-red-600">{lookupError}</p> : null}
      </ColorBlock>

      {profile ? (
        <ColorBlock color="yellow" padding="lg" className="space-y-4">
          <div className="flex items-center gap-4">
            <SmartImage
              src={profile.profilePhotoUrl}
              alt=""
              size="lg"
              className="size-20 rounded-2xl border-[3px] border-border"
            />
            <div>
              <p className="text-2xl font-extrabold">{profile.displayName}</p>
              <p className="font-bold text-muted-foreground">@{profile.handle}</p>
              <p className="text-sm font-bold">{formatNumber(profile.followerCount)} followers</p>
            </div>
          </div>
          {profile.bio ? <p className="text-sm text-muted-foreground">{profile.bio}</p> : null}
        </ColorBlock>
      ) : null}

      {profile ? (
        <ColorBlock color="cream" padding="lg" className="space-y-4">
          {listed ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setType("rank_bid");
                  setAmount(Math.max(amount, MIN_RANKING_BID));
                }}
                className={`rounded-2xl border-[3px] border-border p-4 text-left font-extrabold ${type === "rank_bid" ? "bg-hot-pink text-on-accent" : "bg-card text-foreground"}`}
                data-analytics="submit_choose_rank_bid"
              >
                Rank Bid · ₹199+
                <p className="mt-1 text-sm font-medium">Overtake the current #1. Bid must beat the live amount + ₹100.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("hype");
                  setAmount(Math.max(MIN_HYPE, type === "hype" ? amount : MIN_HYPE));
                }}
                className={`rounded-2xl border-[3px] border-border p-4 text-left font-extrabold ${type === "hype" ? "bg-lemon text-on-accent" : "bg-card text-foreground"}`}
                data-analytics="submit_choose_hype"
              >
                Hype · ₹49+
                <p className="mt-1 text-sm font-medium">Support them without changing rank. Unlimited times.</p>
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl border-[3px] border-border bg-hot-pink p-4 text-left font-extrabold text-on-accent"
              data-analytics="submit_new_rank_bid"
            >
              Rank Bid · ₹199
              <p className="mt-1 text-sm font-medium">
                First listing claims #1 for ₹199. Hype is for supporting creators who are already ranked.
              </p>
            </div>
          )}
          {listed ? null : (
            <>
              <label className="block text-sm font-extrabold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 w-full rounded-xl border-[3px] border-border bg-input-bg px-3 font-bold text-input-text"
              >
                {ARENA_CATEGORY_TABS.filter((tab) => tab.slug !== "all").map((tab) => (
                  <option key={tab.slug} value={tab.slug}>
                    {tab.emoji} {tab.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className="block text-sm font-extrabold">Amount (₹)</label>
          <Input
            type="number"
            min={minAmount}
            value={displayAmount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="border-[3px] border-border"
          />
          <BoldButton
            color="pink"
            size="lg"
            fullWidth
            disabled={payState === "preparing" || payState === "checkout" || payState === "verifying"}
            onClick={() => void checkout()}
          >
            {payState === "verifying" ? "Confirming payment…" : `Pay ₹${displayAmount} · no account needed`}
          </BoldButton>
          {statusNote ? <p className="text-sm font-bold">{statusNote}</p> : null}
          <p className="text-xs text-muted-foreground">
            Razorpay collects email/phone for the receipt. We go live only after the server webhook verifies
            payment. Rank bids are non-refundable regardless of final rank.
          </p>
        </ColorBlock>
      ) : null}
    </div>
  );
}
