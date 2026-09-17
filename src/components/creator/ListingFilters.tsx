"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BoldButton, ColorBlock } from "@/components/system";
import { categoryIcon } from "@/lib/categories";
import type { Category } from "@/types/database";

const sorts = [
  { value: "bid", label: "Highest Bid" },
  { value: "hype", label: "Most Hype" },
  { value: "clicks", label: "Most Clicks" },
  { value: "followers", label: "Most Followers" },
  { value: "newest", label: "Newest" },
];

export function ListingFilters({
  categories: initialCategories = [],
}: {
  categories?: Category[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(initialCategories.length === 0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/categories");
        const json = (await res.json()) as { categories?: Category[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Could not load categories from the database.");
          setCategories([]);
          return;
        }
        const items = (json.categories ?? []).filter((c) => c?.id && c.slug && c.name);
        setCategories(items);
        setError("");
      } catch {
        if (!cancelled) {
          setError("Could not load categories. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialCategories]);

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    const merged = { q, category: params.get("category") ?? "", sort: params.get("sort") ?? "", ...next };
    Object.entries(merged).forEach(([k, v]) => {
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
          className="h-11 flex-1 rounded-xl border-[3px] border-border bg-input-bg px-3 text-sm font-medium text-input-text"
          aria-label="Search creators"
        />
        <select
          className="h-11 rounded-xl border-[3px] border-border bg-input-bg px-3 text-sm font-bold text-input-text"
          value={params.get("category") ?? "all"}
          onChange={(e) => update({ category: e.target.value })}
          aria-label="Filter by category"
          disabled={loading}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {categoryIcon(c.slug, c.icon)} {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border-[3px] border-border bg-input-bg px-3 text-sm font-bold text-input-text"
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
      {loading ? <p className="mt-2 text-xs font-bold text-muted-foreground">Loading categories…</p> : null}
      {!loading && error ? (
        <p className="mt-2 text-xs font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && categories.length === 0 ? (
        <p className="mt-2 text-xs font-bold text-muted-foreground">No categories available.</p>
      ) : null}
    </ColorBlock>
  );
}
