import { Suspense } from "react";
import type { Metadata } from "next";
import { ClaimHero } from "@/components/home/ClaimHero";
import { HomeCategoryTabs } from "@/components/home/HomeCategoryTabs";
import { HomeRangeToggle } from "@/components/home/HomeRangeToggle";
import { HomeRankList } from "@/components/home/HomeRankList";
import { TodaySidebar } from "@/components/home/TodaySidebar";
import { HomeBelowFold } from "@/components/home/HomeBelowFold";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ_ITEMS } from "@/lib/copy/faq";
import { cachedCategories, cachedRankedCreators } from "@/lib/listing-cache";
import { siteUrl } from "@/lib/format";
import { MIN_HYPE_AMOUNT, MIN_RANKING_BID } from "@/lib/ranking";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "ViralRank.buzz — Discover. Hype. Rank.",
  description:
    `Paid Instagram creator ranking arena. First bid ₹${MIN_RANKING_BID.toLocaleString("en-IN")}. Hype from ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")} adds directly to a creator's score. Ranking bids and hype both count toward rank. No signup.`,
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category || "all";
  const range = sp.range === "today" ? "today" : "all";
  const origin = siteUrl();

  const [ranked, today, categoryResult] = await Promise.all([
    cachedRankedCreators({ category, range, limit: 40 }),
    cachedRankedCreators({ range: "today", limit: 8 }),
    cachedCategories(),
  ]);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ViralRank.buzz",
            url: origin,
            logo: `${origin}/viralrank-logo.jpg`,
            description:
              "Paid Instagram creator ranking arena. Combined score is highest verified rank bid plus verified hype. Ranking bids and hype both count toward rank.",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <HomeCategoryTabs active={category} range={range} categories={categoryResult.items} />
        <HomeRangeToggle range={range} category={category} />
        <ClaimHero category={category} categories={categoryResult.items} />
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
