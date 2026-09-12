import { Suspense } from "react";
import { ClaimHero } from "@/components/home/ClaimHero";
import { HomeCategoryTabs } from "@/components/home/HomeCategoryTabs";
import { HomeRangeToggle } from "@/components/home/HomeRangeToggle";
import { HomeRankList } from "@/components/home/HomeRankList";
import { TodaySidebar } from "@/components/home/TodaySidebar";
import { HomeBelowFold } from "@/components/home/HomeBelowFold";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { cachedRankedCreators } from "@/lib/listing-cache";

export const revalidate = 30;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category || "all";
  const range = sp.range === "today" ? "today" : "all";

  const [ranked, today] = await Promise.all([
    cachedRankedCreators({ category, range, limit: 40 }),
    cachedRankedCreators({ range: "today", limit: 8 }),
  ]);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <HomeCategoryTabs active={category} range={range} />
        <HomeRangeToggle range={range} category={category} />
        <ClaimHero claimPrice={ranked.claimPrice} category={category} />
        <Disclaimer />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <HomeRankList items={ranked.items} />
          <TodaySidebar items={today.items} />
        </div>
      </div>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm font-bold text-muted-foreground">
            Loading more of the arena…
          </div>
        }
      >
        <HomeBelowFold />
      </Suspense>
    </>
  );
}
