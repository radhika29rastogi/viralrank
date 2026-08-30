"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BoldButton, ColorBlock } from "@/components/system";
import type { Category } from "@/types/database";

const sorts = [
  { value: "bid", label: "Highest Bid" },
  { value: "hype", label: "Most Hype" },
  { value: "clicks", label: "Most Clicks" },
  { value: "followers", label: "Most Followers" },
  { value: "newest", label: "Newest" },
];

export function ListingFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    });
    sp.delete("page");
    router.push(`?${sp.toString()}`);
  }

  return (
    <ColorBlock color="cream" padding="md">
      <form
        className="flex flex-col gap-3 md:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q });
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username, name, location"
          className="h-11 flex-1 rounded-xl border-[3px] border-black bg-cream px-3 text-sm font-medium"
          aria-label="Search creators"
        />
        <select
          className="h-11 rounded-xl border-[3px] border-black bg-cream px-3 text-sm font-bold"
          value={params.get("category") ?? "all"}
          onChange={(e) => update({ category: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border-[3px] border-black bg-cream px-3 text-sm font-bold"
          value={params.get("sort") ?? "bid"}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label="Sort creators"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <BoldButton type="submit" color="yellow">
          Search
        </BoldButton>
      </form>
    </ColorBlock>
  );
}
