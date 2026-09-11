import { FireIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { Badge, BoldButton, DisplayHeadline } from "@/components/system";
import { HowItWorks } from "@/components/layout/HowItWorks";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { HeroCaption } from "@/components/home/HeroCaption";
import { LiveStatsStrip } from "@/components/home/LiveStatsStrip";
import { FlavorGrid } from "@/components/home/FlavorGrid";
import { FaqSection } from "@/components/home/FaqSection";
import { HomeCreatorsSection } from "@/components/home/HomeCreatorsSection";
import { HomeLiveBattles } from "@/components/home/HomeLiveBattles";
import { HomeAnalytics } from "@/components/home/HomeAnalytics";
import {
  getArenaFeed,
  getCategories,
  getCreators,
  getLiveBattle,
  getLiveStats,
  getTopTwo,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [top, battle, activity, stats, categories, listed] = await Promise.all([
    getTopTwo(),
    getLiveBattle(),
    getArenaFeed(24),
    getLiveStats(),
    getCategories().then((r) => r.items),
    getCreators({ sort: "trending", limit: 12 }),
  ]);

  return (
    <>
      <LiveStatsStrip initial={stats} />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <section className="relative mx-auto max-w-4xl pt-10 text-center">
          <Badge color="pink" rotate={-2} className="absolute top-0 left-0 sm:left-8" icon="🔥">
            Trending
          </Badge>
          <Badge color="yellow" rotate={2} pulse className="absolute top-0 right-0 sm:right-8" icon="👑">
            #1 today
          </Badge>
          <DisplayHeadline align="center" size="xl" accent="deserves">
            WHO deserves #1?
          </DisplayHeadline>
          <p className="mx-auto mt-6 max-w-xl text-base text-neutral-500">
            Creators compete for attention. You decide who gets the hype.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <BoldButton href="/submit" color="pink" size="lg" icon={<TrophyIcon className="size-4" />}>
              Rank a Creator
            </BoldButton>
            <BoldButton href="/explore" color="yellow" size="lg" icon={<FireIcon className="size-4" />}>
              Explore Creators
            </BoldButton>
          </div>
          <HeroCaption />
        </section>
      </div>

      <ActivityFeed initial={activity} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        <HowItWorks />
        <HomeCreatorsSection creators={listed.items} />
        <HomeLiveBattles battle={battle} leaders={top} />
        <HomeAnalytics stats={stats} />
        <FlavorGrid categories={categories} />
        <FaqSection />
        <ClosingCta />
      </div>
    </>
  );
}
