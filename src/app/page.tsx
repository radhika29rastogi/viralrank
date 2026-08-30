import { Flame, Trophy } from "lucide-react";
import { ArenaBattle } from "@/components/battle/BattleCard";
import { Badge, BoldButton, DisplayHeadline } from "@/components/system";
import { HowItWorks } from "@/components/layout/HowItWorks";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { HeroCaption } from "@/components/home/HeroCaption";
import { LiveStatsStrip } from "@/components/home/LiveStatsStrip";
import { FlavorGrid } from "@/components/home/FlavorGrid";
import { FaqSection } from "@/components/home/FaqSection";
import { HomeCreatorsSection } from "@/components/home/HomeCreatorsSection";
import { getArenaFeed, getCategories, getCreators, getLiveStats, getTopTwo } from "@/lib/queries";
import { creatorsForCarousel } from "@/lib/demo-creators";

export default async function HomePage() {
  const [top, activity, stats, categories, listed] = await Promise.all([
    getTopTwo(),
    getArenaFeed(24),
    getLiveStats(),
    getCategories(),
    getCreators({ sort: "bid", limit: 12 }),
  ]);
  const carouselCreators = creatorsForCarousel(listed.items);

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
            <BoldButton href="/submit" color="pink" size="lg" icon={<Trophy className="size-4" />}>
              Rank a Creator
            </BoldButton>
            <BoldButton href="/explore" color="yellow" size="lg" icon={<Flame className="size-4" />}>
              Explore Creators
            </BoldButton>
          </div>
          <HeroCaption />
        </section>

        <ArenaBattle leaders={top} />
      </div>

      <ActivityFeed initial={activity} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        <HowItWorks />
        <HomeCreatorsSection creators={carouselCreators} />
        <FlavorGrid categories={categories} />
        <FaqSection />
        <ClosingCta />
      </div>
    </>
  );
}
