import type { Metadata } from "next";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { ListingFilters } from "@/components/creator/ListingFilters";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { cachedCategories, cachedCreators } from "@/lib/listing-cache";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Explore",
  description: "Search Instagram creators on ViralRank.buzz.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const [{ items }, categoryResult] = await Promise.all([
    cachedCreators({
      search: sp.q,
      category: sp.category,
      sort: (sp.sort as "bid" | "hype" | "clicks" | "followers" | "newest") || "bid",
      limit: 24,
    }),
    cachedCategories(),
  ]);
  const categories = categoryResult.items;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Explore">
        Explore creators
      </DisplayHeadline>
      <ListingFilters categories={categories} />
      {!items.length ? (
        <ColorBlock color="cream" className="py-16 text-center">
          <p className="font-extrabold text-foreground">No creators here yet. Be the first. 🔥</p>
        </ColorBlock>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
}
