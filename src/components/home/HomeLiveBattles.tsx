import { ArenaBattle } from "@/components/battle/BattleCard";
import { YesterdayBattleWinner } from "@/components/home/YesterdayBattleWinner";
import { Badge, DisplayHeadline } from "@/components/system";
import { isPublicCreator } from "@/lib/creators/public";
import { rankingScore } from "@/lib/ranking";
import type { DailyBattleResult } from "@/lib/arena/battle";
import type { Creator } from "@/types/database";

export function HomeLiveBattles({
  leaders,
  yesterday,
  todayFinal,
}: {
  leaders: Creator[];
  yesterday?: DailyBattleResult | null;
  todayFinal?: DailyBattleResult | null;
}) {
  const pair = leaders
    .filter((row) => {
      const score = Number(
        row.combined_score ??
          rankingScore(Number(row.current_highest_bid || 0), Number(row.total_hype_amount || 0)),
      );
      return isPublicCreator(row) && score > 0;
    })
    .slice(0, 2);
  const final = Boolean(todayFinal?.winner);

  return (
    <section className="space-y-8 py-4" data-analytics="home_live_battles">
      <div className="text-center">
        <Badge color="coral" icon="⚔️">
          {final ? "Battle final" : "Live Battles"}
        </Badge>
        <DisplayHeadline as="h2" align="center" size="md" className="mt-4" accent="Battles">
          {final ? "Today's battle is final" : "Live Battles"}
        </DisplayHeadline>
        <p className="mt-3 text-muted-foreground">
          {final
            ? "Scored at 8:00 PM IST. This result does not change the main leaderboard."
            : pair.length >= 2
              ? "Live #1 vs #2 by combined score. Daily winner is scored at 8:00 PM IST."
              : pair.length === 1
                ? "Defending #1 — no challenger yet."
                : "Arena warming up. Two verified payments start the battle."}
        </p>
      </div>
      <YesterdayBattleWinner yesterday={yesterday ?? null} todayFinal={todayFinal ?? null} />
      <ArenaBattle leaders={pair} showNewOne={final} />
    </section>
  );
}
