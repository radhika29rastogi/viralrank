import Link from "next/link";
import { ColorBlock } from "@/components/system";
import { SmartImage } from "@/components/media/SmartImage";
import type { DailyBattleResult } from "@/lib/arena/battle";

export function YesterdayBattleWinner({
  yesterday,
  todayFinal,
}: {
  yesterday: DailyBattleResult | null;
  todayFinal: DailyBattleResult | null;
}) {
  const card = todayFinal ?? yesterday;
  if (!card?.winner) return null;
  const isTodayFinal = Boolean(todayFinal?.winner);
  const winner = card.winner;

  return (
    <section data-analytics="yesterday_battle_winner">
    <ColorBlock color="lime" padding="md" className="space-y-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-on-accent">
        {isTodayFinal ? "Today's battle — final" : "Yesterday's Battle Winner"}
      </p>
      <div className="flex items-center gap-3">
        <SmartImage
          src={winner.profile_image_url || "/viralrank-logo.jpg"}
          alt=""
          size="md"
          className="size-14 rounded-xl border-[3px] border-border"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-on-accent">{winner.name}</p>
          <p className="truncate text-sm font-bold text-on-accent/80">@{winner.instagram_username}</p>
          <p className="text-xs font-bold text-on-accent/80">
            Won on {card.decided_by === "hype" ? "hype received that day" : "visits and engagement"}
          </p>
        </div>
      </div>
      <Link href={`/creator/${winner.instagram_username}`} className="text-sm font-extrabold underline text-on-accent">
        View winner →
      </Link>
    </ColorBlock>
    </section>
  );
}
