import Link from "next/link";
import { Badge, ColorBlock } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { HypeButton } from "@/components/creator/HypeButton";
import { formatCompactCount } from "@/lib/creator-stats";
import { displayRank, totalEngagement } from "@/lib/creator-engagement";
import type { Creator } from "@/types/database";

export function CreatorCard({ creator }: { creator: Creator; index?: number }) {
  const category = creator.categories?.name ?? "Other";
  const bid = Number(creator.current_highest_bid) || 0;
  const rankLabel = displayRank(creator.current_rank) ?? "New";

  return (
    <ColorBlock color="cream" padding="md">
      <Badge color="yellow" float="tl" rotate={-2}>
        {rankLabel}
      </Badge>
      <Badge color="purple" float="tr" rotate={2}>
        {category}
      </Badge>

      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        <CreatorAvatar name={creator.name} imageUrl={creator.profile_image_url} size="md" />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-black">{creator.name}</p>
          <p className="truncate text-sm text-neutral-500">@{creator.instagram_username}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
        <div>
          <dt className="text-neutral-500">🔥 HYPE</dt>
          <dd className="text-base text-black">{formatCompactCount(creator.hype_count)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">👀 Views</dt>
          <dd className="text-base text-black">{formatCompactCount(creator.profile_clicks)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Instagram</dt>
          <dd className="text-base text-black">{formatCompactCount(creator.instagram_clicks ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Engagement</dt>
          <dd className="text-base text-black">{formatCompactCount(totalEngagement(creator))}</dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-sm text-neutral-500">
        Ranking bid {formatCompactCount(bid)}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={bid}
          initialCount={creator.hype_count}
        />
        <BidButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={bid}
          rank={creator.current_rank}
        />
        <Link
          href={`/api/creators/${creator.id}/instagram`}
          className="text-center text-sm font-semibold text-black underline"
        >
          Instagram →
        </Link>
        <Link
          href={`/creator/${creator.instagram_username}`}
          className="text-center text-sm font-semibold text-neutral-500 underline"
        >
          View profile
        </Link>
      </div>
    </ColorBlock>
  );
}
