import Link from "next/link";
import { Badge } from "@/components/system";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { HypeButton } from "@/components/creator/HypeButton";
import { formatCompactCount } from "@/lib/creator-stats";
import { displayRank, totalEngagement } from "@/lib/creator-engagement";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types/database";

const pastels = [
  "bg-sky",
  "bg-lemon",
  "bg-lavender",
  "bg-lime",
  "bg-bubblegum",
  "bg-coral",
] as const;

export function CreatorDirectoryCard({
  creator,
  index = 0,
}: {
  creator: Creator;
  index?: number;
}) {
  const category = creator.categories?.name ?? "Other";
  const rotate = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const href = `/creator/${creator.instagram_username}`;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-3xl border-[4px] border-border p-4 shadow-[4px_4px_0_#000]",
        pastels[index % pastels.length],
        rotate,
      )}
    >
      <Badge color="yellow" className="absolute top-3 left-3 z-10" rotate={-2}>
        {displayRank(creator.current_rank) ?? "New"}
      </Badge>
      <Badge color="purple" className="absolute top-3 right-3 z-10" rotate={2}>
        {category}
      </Badge>
      <div className="mx-auto mt-6">
        <CreatorAvatar name={creator.name} imageUrl={creator.profile_image_url} size="lg" />
      </div>
      <p className="mt-4 truncate text-center text-lg font-extrabold text-foreground">{creator.name}</p>
      <p className="truncate text-center text-sm font-bold text-muted-foreground">@{creator.instagram_username}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
        <div>
          <dt className="text-muted-foreground">🔥 HYPE</dt>
          <dd className="text-sm text-foreground">{formatCompactCount(creator.hype_count)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">👀 Views</dt>
          <dd className="text-sm text-foreground">{formatCompactCount(creator.profile_clicks)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Instagram</dt>
          <dd className="text-sm text-foreground">{formatCompactCount(creator.instagram_clicks ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Engagement</dt>
          <dd className="text-sm text-foreground">{formatCompactCount(totalEngagement(creator))}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          instagramUsername={creator.instagram_username}
          currentHighestBid={Number(creator.current_highest_bid) || 0}
          initialCount={creator.hype_count}
        />
      </div>
      <Link
        href={href}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-xl border-[3px] border-border bg-card text-sm font-extrabold text-foreground shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none"
      >
        View Creator →
      </Link>
      <Link
        href={`/api/creators/${creator.id}/instagram`}
        className="mt-2 text-center text-xs font-bold text-foreground underline"
      >
        Instagram →
      </Link>
    </article>
  );
}
