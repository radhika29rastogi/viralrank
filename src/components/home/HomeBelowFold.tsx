import { HowItWorks } from "@/components/layout/HowItWorks";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { FlavorGrid } from "@/components/home/FlavorGrid";
import { FaqSection } from "@/components/home/FaqSection";
import { HomeCreatorsSection } from "@/components/home/HomeCreatorsSection";
import { HomeLiveBattles } from "@/components/home/HomeLiveBattles";
import {
  cachedArenaFeed,
  cachedCategories,
  cachedCreators,
  cachedHomeBattleContext,
} from "@/lib/listing-cache";

export async function HomeBelowFold() {
  const [battleContext, activity, categories, listed] = await Promise.all([
    cachedHomeBattleContext(),
    cachedArenaFeed(24),
    cachedCategories().then((r) => r.items),
    cachedCreators({ sort: "trending", limit: 12 }),
  ]);

  return (
    <>
      <ActivityFeed initial={activity} />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        <HowItWorks />
        <HomeCreatorsSection creators={listed.items} />
        <HomeLiveBattles
          leaders={battleContext.leaders}
          yesterday={battleContext.yesterday}
          todayFinal={battleContext.todayFinal}
        />
        <FlavorGrid categories={categories} />
        <FaqSection />
        <ClosingCta />
      </div>
    </>
  );
}
