import type { Metadata } from "next";
import Link from "next/link";

import { CreatorCard } from "@/components/creator/CreatorCard";
import { ThroneCard } from "@/components/creator/ThroneCard";
import { ListingFilters } from "@/components/creator/ListingFilters";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { cachedCategories, cachedCreators, cachedRankedCreators } from "@/lib/listing-cache";
import { displayRankingScore } from "@/lib/arena/ranking";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Rankings",
  description: "Highest combined scores on ViralRank.buzz — verified rank bid plus verified hype.",
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string; q?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as "bid" | "hype" | "clicks" | "followers" | "newest") || "bid";
  const range = sp.range === "today" ? "today" : "all";
  const page = Math.max(1, Number(sp.page || 1));
  const limit = 12;
  const [listed, todayRanked, categoryResult] = await Promise.all([
    cachedCreators({
      search: sp.q,
      category: sp.category,
      sort,
      limit,
      offset: (page - 1) * limit,
    }),
    range === "today"
      ? cachedRankedCreators({ category: sp.category, range: "today", limit })
      : Promise.resolve(null),
    cachedCategories(),
  ]);
  const items = todayRanked ? todayRanked.items : listed.items;
  const total = todayRanked ? todayRanked.items.length : listed.total;
  const categories = categoryResult.items;
  const throne = sort === "bid" && page === 1 ? items[0] : null;
  const grid = throne ? items.slice(1) : items;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Rankings">
        {range === "today" ? "Today's rankings" : "The Rankings"}
      </DisplayHeadline>
      <Disclaimer />
      <ListingFilters categories={categories} />
      {!items.length ? (
        <ColorBlock color="cream" className="py-16 text-center">
          <p className="font-extrabold text-foreground">No creators here yet. Be the first. 🔥</p>
        </ColorBlock>
      ) : (
        <>
          {throne && displayRankingScore(throne) > 0 ? <ThroneCard creator={throne} /> : null}
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {grid.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </>
      )}
      {pages > 1 ? (
        <div className="flex justify-center gap-4 text-sm font-bold text-foreground">
          {page > 1 ? (
            <Link
              className="underline"
              href={`?${new URLSearchParams({
                ...(sp.q ? { q: sp.q } : {}),
                ...(sp.category ? { category: sp.category } : {}),
                ...(sp.sort ? { sort: sp.sort } : {}),
                page: String(page - 1),
              }).toString()}`}
            >
              Previous
            </Link>
          ) : null}
          <span className="text-muted-foreground">Page {page} / {pages}</span>
          {page < pages ? (
            <Link
              className="underline"
              href={`?${new URLSearchParams({
                ...(sp.q ? { q: sp.q } : {}),
                ...(sp.category ? { category: sp.category } : {}),
                ...(sp.sort ? { sort: sp.sort } : {}),
                page: String(page + 1),
              }).toString()}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
