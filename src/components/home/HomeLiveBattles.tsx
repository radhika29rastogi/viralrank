import { ArenaBattle } from "@/components/battle/BattleCard";
import { Badge, DisplayHeadline } from "@/components/system";
import { isPublicCreator } from "@/lib/creators/public";
import type { Battle, Creator } from "@/types/database";

export function HomeLiveBattles({
  battle,
  leaders,
}: {
  battle: Battle | null;
  leaders: Creator[];
}) {
  const one = battle?.creator_one;
  const two = battle?.creator_two;
  const fromBattle =
    one && two && isPublicCreator(one) && isPublicCreator(two) ? [one, two] : [];
  const pair = fromBattle.length === 2 ? fromBattle : leaders.filter(isPublicCreator).slice(0, 2);

  return (
    <section className="space-y-8 py-4" data-analytics="home_live_battles">
      <div className="text-center">
        <Badge color="coral" icon="⚔️">
          Live Battles
        </Badge>
        <DisplayHeadline as="h2" align="center" size="md" className="mt-4" accent="Battles">
          Live Battles
        </DisplayHeadline>
        <p className="mt-3 text-neutral-500">
          {pair.length >= 2
            ? "Active #1 vs #2 on the paid ranking."
            : pair.length === 1
              ? "One listed creator is holding #1. A second paid listing starts the battle."
              : "No live battle yet. Two paid listings are required."}
        </p>
      </div>
      <ArenaBattle leaders={pair} />
    </section>
  );
}
