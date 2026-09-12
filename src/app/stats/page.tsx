import type { Metadata } from "next";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { formatNumber } from "@/lib/format";
import { getPublicStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  description: "Real ViralRank numbers — visitors today, listed creators, verified payments.",
};

export default async function StatsPage() {
  const stats = await getPublicStats();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="numbers">
        Real numbers
      </DisplayHeadline>
      <p className="text-muted-foreground">
        These counts come from the database. We do not invent visitor or payment totals.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <ColorBlock color="yellow" padding="lg">
          <p className="text-sm font-bold">Visitors today (IST)</p>
          <p className="mt-2 text-4xl font-extrabold">{formatNumber(stats.visitorsToday)}</p>
        </ColorBlock>
        <ColorBlock color="pink" padding="lg">
          <p className="text-sm font-bold">Creators listed</p>
          <p className="mt-2 text-4xl font-extrabold">{formatNumber(stats.creatorCount)}</p>
        </ColorBlock>
        <ColorBlock color="lime" padding="lg">
          <p className="text-sm font-bold">Verified payments</p>
          <p className="mt-2 text-4xl font-extrabold">{formatNumber(stats.paymentCount)}</p>
        </ColorBlock>
      </div>
    </div>
  );
}
