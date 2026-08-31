import type { Metadata } from "next";
import Link from "next/link";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { ThroneCard } from "@/components/creator/ThroneCard";
import { ListingFilters } from "@/components/creator/ListingFilters";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { getCategories, getCreators } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Rankings",
  description: "Highest verified ranking bids on ViralRank.buzz.",
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as "bid" | "hype" | "clicks" | "followers" | "newest") || "bid";
  const page = Math.max(1, Number(sp.page || 1));
  const limit = 12;
  const [{ items, total }, categories] = await Promise.all([
    getCreators({ category: sp.category, sort, limit, offset: (page - 1) * limit }),
    getCategories().then((r) => r.items),
  ]);
  const throne = sort === "bid" && page === 1 ? items[0] : null;
  const grid = throne ? items.slice(1) : items;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Rankings">
        The Rankings
      </DisplayHeadline>
      <Disclaimer />
      <ListingFilters categories={categories} />
      {!items.length ? (
        <ColorBlock color="cream" className="py-16 text-center">
          <p className="font-extrabold text-black">No creators here yet. Be the first. 🔥</p>
        </ColorBlock>
      ) : (
        <>
          {throne && (throne.current_highest_bid || 0) > 0 ? <ThroneCard creator={throne} /> : null}
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {grid.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </>
      )}
      {pages > 1 ? (
        <div className="flex justify-center gap-4 text-sm font-bold text-black">
          {page > 1 ? <Link className="underline" href={`?page=${page - 1}`}>Previous</Link> : null}
          <span className="text-neutral-500">Page {page} / {pages}</span>
          {page < pages ? <Link className="underline" href={`?page=${page + 1}`}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
