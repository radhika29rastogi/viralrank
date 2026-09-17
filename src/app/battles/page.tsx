import type { Metadata } from "next";
import { ArenaBattle } from "@/components/battle/BattleCard";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { DisplayHeadline } from "@/components/system";
import { isPublicCreator } from "@/lib/creators/public";
import { cachedTopTwo } from "@/lib/listing-cache";
import { rankingScore } from "@/lib/ranking";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Battles",
  description: "Live #1 vs #2 by combined score. Daily winner at 8:00 PM IST.",
};

export default async function BattlesPage() {
  const top = (await cachedTopTwo())
    .filter((row) => {
      const score = Number(
        row.combined_score ??
          rankingScore(Number(row.current_highest_bid || 0), Number(row.total_hype_amount || 0)),
      );
      return isPublicCreator(row) && score > 0;
    })
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Battle">
        Live Battle
      </DisplayHeadline>
      <p className="text-muted-foreground">
        {top.length >= 2
          ? "Whoever holds #1 and #2 on the live ranking right now. Daily winner is scored at 8:00 PM IST."
          : top.length === 1
            ? "Defending #1 — no challenger yet."
            : "Arena warming up. Two verified payments start the battle."}
      </p>
      <Disclaimer />
      <ArenaBattle leaders={top} />
    </div>
  );
}
