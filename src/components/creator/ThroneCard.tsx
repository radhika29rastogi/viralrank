import { Badge, ColorBlock } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { HypeButton } from "@/components/creator/HypeButton";
import { CountUp } from "@/components/creator/CountUp";
import { SmartImage } from "@/components/media/SmartImage";
import { displayRankingScore } from "@/lib/arena/ranking";
import type { Creator } from "@/types/database";

export function ThroneCard({ creator }: { creator: Creator }) {
  const bid = Number(creator.current_highest_bid) || 0;
  const score = displayRankingScore(creator);
  return (
    <ColorBlock color="yellow" padding="lg">
      <Badge color="pink" float="tl" rotate={-2} icon="👑">
        #1 today
      </Badge>
      <Badge color="blue" float="tr" rotate={2}>
        Throne
      </Badge>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="size-28 overflow-hidden rounded-3xl border-[4px] border-border bg-sky">
          {creator.profile_image_url ? (
            <SmartImage src={creator.profile_image_url} size="lg" className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-extrabold">
              {creator.name.slice(0, 1)}
            </div>
          )}
        </div>
        <p className="mt-4 text-3xl font-extrabold text-on-accent">{creator.name}</p>
        <p className="text-sm text-on-accent/70">@{creator.instagram_username}</p>
        <p className="mt-4 text-5xl font-extrabold text-on-accent">
          <CountUp value={score} />
        </p>
        <p className="mt-1 text-sm font-bold text-on-accent/80">
          combined score · bid ₹{bid.toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-xs font-bold text-on-accent/80">
          Hype adds directly to a creator&apos;s score. Ranking bids and hype both count toward rank.
        </p>
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
          <HypeButton
            creatorId={creator.id}
            creatorName={creator.name}
            instagramUsername={creator.instagram_username}
            currentHighestBid={bid}
            initialCount={creator.hype_count}
          />
          <BidButton
            creatorId={creator.id}
            creatorName={creator.name}
            instagramUsername={creator.instagram_username}
            currentHighestBid={bid}
            totalHypeAmount={Number(creator.total_hype_amount || 0)}
            rivalCombinedScore={creator.rival_combined_score}
            targetRank={creator.target_rank}
            rank={creator.current_rank}
          />
        </div>
      </div>
    </ColorBlock>
  );
}
