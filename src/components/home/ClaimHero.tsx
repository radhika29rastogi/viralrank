"use client";

import { GlobeAltIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BoldButton } from "@/components/system";
import { ARENA_CATEGORY_TABS } from "@/lib/categories";
import { RANK_INCREMENT } from "@/lib/ranking";

export function ClaimHero({
  claimPrice,
  category,
}: {
  claimPrice: number;
  category: string;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [picked, setPicked] = useState(category === "all" ? "memes" : category);
  const [previewSteps, setPreviewSteps] = useState(0);

  const previewPrice = useMemo(
    () => claimPrice + previewSteps * RANK_INCREMENT,
    [claimPrice, previewSteps],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      handle: handle.trim(),
      category: picked,
      amount: String(previewPrice),
      intent: "rank_bid",
    });
    router.push(`/submit?${params.toString()}`);
  }

  return (
    <section className="space-y-6 text-center" data-analytics="home_claim_hero">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
        Claim #1 for{" "}
        <span className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-border bg-card px-3 py-1 text-hot-pink">
          <button
            type="button"
            aria-label="Preview a further overtake"
            onClick={() => setPreviewSteps((n) => Math.max(0, n - 1))}
            className="rounded-lg border-2 border-border bg-input-bg px-2 py-1 text-foreground"
          >
            <MinusIcon className="size-4" />
          </button>
          ₹{previewPrice.toLocaleString("en-IN")}
          <button
            type="button"
            aria-label="Preview stacking another overtake"
            onClick={() => setPreviewSteps((n) => n + 1)}
            className="rounded-lg border-2 border-border bg-input-bg px-2 py-1 text-foreground"
          >
            <PlusIcon className="size-4" />
          </button>
        </span>
      </h1>
      <p className="text-sm font-bold text-muted-foreground">
        Live required amount is ₹{claimPrice.toLocaleString("en-IN")}. + / − only previews the next overtake.
      </p>
      <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
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
          {ARENA_CATEGORY_TABS.filter((tab) => tab.slug !== "all").map((tab) => (
            <option key={tab.slug} value={tab.slug}>
              {tab.emoji} {tab.label}
            </option>
          ))}
        </select>
        <BoldButton type="submit" color="pink" size="lg" className="h-14 rounded-2xl px-6">
          Claim rank
        </BoldButton>
      </form>
    </section>
  );
}
