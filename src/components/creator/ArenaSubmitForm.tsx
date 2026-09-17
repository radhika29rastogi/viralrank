"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BoldButton, ColorBlock } from "@/components/system";
import { SmartImage } from "@/components/media/SmartImage";
import { Input } from "@/components/ui/input";
import { AmountInput, amountIsValid } from "@/components/payments/AmountInput";
import { CouponField, type AppliedCoupon } from "@/components/payments/CouponField";
import { categoryIcon } from "@/lib/categories";
import { useCategories } from "@/lib/use-categories";
import { formatNumber } from "@/lib/format";
import { HYPE_RANK_COPY, MIN_HYPE, MIN_RANKING_BID, bidNeededForRank, minOvertakeAmount } from "@/lib/ranking";
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
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [totalHypeAmount, setTotalHypeAmount] = useState(0);
  const [rivalCombinedScore, setRivalCombinedScore] = useState(0);
  const [targetRank, setTargetRank] = useState(1);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [type, setType] = useState<"rank_bid" | "hype">("rank_bid");
  const [amount, setAmount] = useState<number | "">(Number(search.get("amount")) || MIN_RANKING_BID);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [payState, setPayState] = useState<PayState>("idle");
  const [statusNote, setStatusNote] = useState("");
  const { categories } = useCategories();

  const payType = listed ? type : "rank_bid";
  const minAmount =
    payType === "hype" ? MIN_HYPE : listed ? minOvertakeAmount(currentHighestBid) : MIN_RANKING_BID;
  const suggestedAmount =
    payType === "hype"
      ? MIN_HYPE
      : listed
        ? bidNeededForRank(currentHighestBid, totalHypeAmount, rivalCombinedScore || 0)
        : MIN_RANKING_BID;
  const valid = amountIsValid(amount, minAmount);
  const typed = typeof amount === "number" ? amount : minAmount;
  const charge = coupon && coupon.amountBefore === typed ? coupon.amountAfter : typed;

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
    setCoupon(null);
    try {
      const res = await fetch("/api/instagram/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: raw }),
      });
      const json = (await res.json()) as {
        profile?: InstagramProfileSnapshot;
        listed?: boolean;
        current_highest_bid?: number;
        total_hype_amount?: number;
        rival_combined_score?: number;
        target_rank?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.profile) {
        setLookupError(json.message || json.error || "Something went wrong fetching this profile");
        return;
      }
      const alreadyListed = Boolean(json.listed);
      const liveBid = Number(json.current_highest_bid || 0);
      const hypeTotal = Number(json.total_hype_amount || 0);
      const rival = Number(json.rival_combined_score || 0);
      const takeRank = Number(json.target_rank || 1);
      setProfile(json.profile);
      setHandle(json.profile.handle);
      setListed(alreadyListed);
      setCurrentHighestBid(liveBid);
      setTotalHypeAmount(hypeTotal);
      setRivalCombinedScore(rival);
      setTargetRank(takeRank);
      if (alreadyListed && search.get("intent") === "hype") {
        setType("hype");
        setAmount(MIN_HYPE);
      } else {
        setType("rank_bid");
        const overtake = alreadyListed ? minOvertakeAmount(liveBid) : MIN_RANKING_BID;
        const beat = bidNeededForRank(alreadyListed ? liveBid : 0, alreadyListed ? hypeTotal : 0, rival);
        const fromQuery = Number(search.get("amount"));
        const floor = Math.max(overtake, beat);
        setAmount(fromQuery >= overtake ? fromQuery : floor);
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
    if (!profile || !valid) return;
    setPayState("preparing");
    setStatusNote("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instagram_handle: profile.handle,
          type: payType,
          amount: typed,
          category,
          coupon_code: payType === "rank_bid" ? coupon?.code : undefined,
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
                  setAmount(bidNeededForRank(currentHighestBid, totalHypeAmount, rivalCombinedScore));
                  setCoupon(null);
                }}
                className={`rounded-2xl border-[3px] border-border p-4 text-left font-extrabold ${type === "rank_bid" ? "bg-hot-pink text-on-accent" : "bg-card text-foreground"}`}
                data-analytics="submit_choose_rank_bid"
              >
                Rank Bid · ₹{minOvertakeAmount(currentHighestBid).toLocaleString("en-IN")}+
                <p className="mt-1 text-sm font-medium">
                  Minimum next bid: ₹{minOvertakeAmount(currentHighestBid).toLocaleString("en-IN")}. Beat ₹
                  {bidNeededForRank(currentHighestBid, totalHypeAmount, rivalCombinedScore).toLocaleString("en-IN")} to take #{targetRank}.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("hype");
                  setAmount(MIN_HYPE);
                  setCoupon(null);
                }}
                className={`rounded-2xl border-[3px] border-border p-4 text-left font-extrabold ${type === "hype" ? "bg-lemon text-on-accent" : "bg-card text-foreground"}`}
                data-analytics="submit_choose_hype"
              >
                Hype · ₹{MIN_HYPE.toLocaleString("en-IN")}+
                <p className="mt-1 text-sm font-medium">{HYPE_RANK_COPY}</p>
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl border-[3px] border-border bg-hot-pink p-4 text-left font-extrabold text-on-accent"
              data-analytics="submit_new_rank_bid"
            >
              Rank Bid · ₹{MIN_RANKING_BID.toLocaleString("en-IN")}
              <p className="mt-1 text-sm font-medium">
                First bid on a new creator is ₹{MIN_RANKING_BID.toLocaleString("en-IN")}. {HYPE_RANK_COPY}
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
                {categories.map((tab) => (
                  <option key={tab.slug} value={tab.slug}>
                    {categoryIcon(tab.slug, tab.icon)} {tab.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {payType === "rank_bid" ? (
            <p className="text-sm font-bold text-muted-foreground">
              Minimum next bid: ₹{minAmount.toLocaleString("en-IN")}. To reach #{targetRank}, you need a
              combined score above ₹{Number(rivalCombinedScore || 0).toLocaleString("en-IN")}.
            </p>
          ) : (
            <p className="text-sm font-bold text-muted-foreground">{HYPE_RANK_COPY}</p>
          )}
          <AmountInput
            minAmount={minAmount}
            suggestedAmount={suggestedAmount}
            value={amount}
            onChange={(next) => {
              setAmount(next);
              setCoupon(null);
            }}
          />
          {valid && payType === "rank_bid" ? (
            <CouponField
              amount={typed}
              applied={coupon}
              onApplied={setCoupon}
              onCleared={() => setCoupon(null)}
              disabled={payState === "preparing" || payState === "checkout" || payState === "verifying"}
              paymentType="rank_bid"
            />
          ) : null}
          <BoldButton
            color="pink"
            size="lg"
            fullWidth
            disabled={
              !valid || payState === "preparing" || payState === "checkout" || payState === "verifying"
            }
            onClick={() => void checkout()}
          >
            {payState === "verifying"
              ? "Confirming payment…"
              : `Pay ₹${charge.toLocaleString("en-IN")} · no account needed`}
          </BoldButton>
          {statusNote ? <p className="text-sm font-bold">{statusNote}</p> : null}
          <p className="text-xs text-muted-foreground">
            Razorpay collects email/phone for the receipt. We go live only after the server webhook verifies
            payment. Rank bids are non-refundable regardless of final rank. Coupons discount the charge, not
            the ranked amount.
          </p>
        </ColorBlock>
      ) : null}
    </div>
  );
}
