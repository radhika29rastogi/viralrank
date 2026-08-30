import type { Metadata } from "next";
import { ArenaBattle } from "@/components/battle/BattleCard";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { DisplayHeadline } from "@/components/system";
import { getLiveBattle, getTopTwo } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Battles",
  description: "#1 vs #2 by verified ranking bid.",
};

export default async function BattlesPage() {
  const [top, live] = await Promise.all([getTopTwo(), getLiveBattle()]);
  const showNewOne = Boolean(live?.winner_id && top[0] && live.winner_id === top[0].id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Battle">
        Live Battle
      </DisplayHeadline>
      <Disclaimer />
      <ArenaBattle leaders={top} showNewOne={showNewOne} />
    </div>
  );
}
