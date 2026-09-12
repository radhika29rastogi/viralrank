import type { Metadata } from "next";
import { CreatorDirectoryCard } from "@/components/creator/CreatorDirectoryCard";
import { FlavorGrid } from "@/components/home/FlavorGrid";
import { FaqSection } from "@/components/home/FaqSection";
import { Badge, BoldButton, ColorBlock, DisplayHeadline } from "@/components/system";
import { cachedCategories, cachedCreators } from "@/lib/listing-cache";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Creators",
  description: "Discover the people behind the internet's next viral moment.",
};

export default async function CreatorsPage() {
  const [{ items }, categories] = await Promise.all([
    cachedCreators({ sort: "bid", limit: 24 }),
    cachedCategories().then((r) => r.items),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
      <section className="text-center">
        <Badge color="yellow" icon="👀">
          Creators
        </Badge>
        <DisplayHeadline align="center" size="md" className="mt-4">
          Creators are cooking. 👀
        </DisplayHeadline>
        <p className="mt-3 text-muted-foreground">
          Discover the people behind the internet&apos;s next viral moment.
        </p>
      </section>

      {!items.length ? (
        <ColorBlock color="cream" className="py-16 text-center">
          <p className="font-extrabold">No creators here yet. Be the first. 🔥</p>
          <div className="mt-6 flex justify-center">
            <BoldButton href="/submit" color="pink">
              Rank a Creator
            </BoldButton>
          </div>
        </ColorBlock>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((creator, i) => (
            <CreatorDirectoryCard key={creator.id} creator={creator} index={i} />
          ))}
        </div>
      )}

      <FlavorGrid categories={categories} />
      <FaqSection />
    </div>
  );
}
