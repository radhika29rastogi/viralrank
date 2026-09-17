"use client";

import { GlobeAltIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoldButton } from "@/components/system";
import { amountIsValid } from "@/components/payments/AmountInput";
import { CATEGORY_CATALOG, categoryIcon } from "@/lib/categories";
import { MIN_RANKING_BID } from "@/lib/ranking";
import type { Category } from "@/types/database";

export function ClaimHero({
  category,
  categories = [],
}: {
  claimPrice?: number;
  category: string;
  categories?: Category[];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [picked, setPicked] = useState(category === "all" ? "memes" : category);
  const [amount, setAmount] = useState<number | "">(MIN_RANKING_BID);
  const valid = amountIsValid(amount, MIN_RANKING_BID);
  const payLabel = typeof amount === "number" ? amount : MIN_RANKING_BID;
  const digits = amount === "" ? "" : String(amount);
  const belowMin = typeof amount === "number" && amount < MIN_RANKING_BID;
  const options =
    categories.length > 0
      ? categories
      : CATEGORY_CATALOG.map((row) => ({
          id: row.slug,
          name: row.name,
          slug: row.slug,
          icon: row.icon,
        }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || typeof amount !== "number") return;
    const params = new URLSearchParams({
      handle: handle.trim(),
      category: picked,
      amount: String(amount),
      intent: "rank_bid",
    });
    router.push(`/submit?${params.toString()}`);
  }

  return (
    <section className="space-y-6 text-center" data-analytics="home_claim_hero">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Claim #1 for{" "}
          <label className="inline-flex items-baseline text-hot-pink">
            <span className="font-marker font-normal">₹</span>
            <input
              id="claim-amount"
              inputMode="numeric"
              type="text"
              aria-label="Ranking bid amount in rupees"
              aria-invalid={belowMin}
              aria-describedby={belowMin ? "claim-amount-error" : undefined}
              value={digits}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setAmount(raw === "" ? "" : Number(raw));
              }}
              placeholder={String(MIN_RANKING_BID)}
              className="border-0 border-b-2 border-transparent bg-transparent p-0 font-marker font-normal text-hot-pink caret-hot-pink outline-none placeholder:text-hot-pink/40 focus:border-hot-pink focus-visible:ring-0"
              style={{ width: `${Math.max(digits.length, String(MIN_RANKING_BID).length)}ch` }}
            />
          </label>
        </h1>
        {belowMin ? (
          <p id="claim-amount-error" className="text-sm font-bold text-destructive">
            Minimum ₹{MIN_RANKING_BID.toLocaleString("en-IN")}
          </p>
        ) : null}
        <p className="text-sm font-bold text-muted-foreground">
          Hype adds directly to a creator&apos;s score. Ranking bids and hype both count toward rank.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <GlobeAltIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Instagram URL or @handle"
              className="h-14 w-full rounded-2xl border-[3px] border-border bg-input-bg pl-11 pr-3 font-bold text-input-text shadow-[4px_4px_0_#000] placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="h-14 rounded-2xl border-[3px] border-border bg-input-bg px-3 font-extrabold text-input-text shadow-[4px_4px_0_#000]"
          >
            {options.map((tab) => (
              <option key={tab.slug} value={tab.slug}>
                {categoryIcon(tab.slug, tab.icon)} {tab.name}
              </option>
            ))}
          </select>
          <BoldButton type="submit" color="pink" size="lg" className="h-14 rounded-2xl px-6" disabled={!valid}>
            Pay ₹{payLabel.toLocaleString("en-IN")} · no account needed
          </BoldButton>
        </div>
      </form>
    </section>
  );
}
