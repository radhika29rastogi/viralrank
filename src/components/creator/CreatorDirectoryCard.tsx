import Link from "next/link";
import { Badge } from "@/components/system";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { formatCompactCount, viralScore } from "@/lib/creator-stats";
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
  const score = viralScore(creator);
  const rotate = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const href = `/creator/${creator.instagram_username}`;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-3xl border-[4px] border-black p-4 shadow-[4px_4px_0_#000]",
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
      <p className="mt-4 truncate text-center text-lg font-extrabold text-black">{creator.name}</p>
      <p className="truncate text-center text-sm font-bold text-black/70">@{creator.instagram_username}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
        <div>
          <dt className="text-black/60">🔥 HYPE</dt>
          <dd className="text-sm text-black">{formatCompactCount(creator.hype_count)}</dd>
        </div>
        <div>
          <dt className="text-black/60">👀 Views</dt>
          <dd className="text-sm text-black">{formatCompactCount(creator.profile_clicks)}</dd>
        </div>
        <div>
          <dt className="text-black/60">Viral</dt>
          <dd className="text-sm text-black">{score}</dd>
        </div>
        <div>
          <dt className="text-black/60">Engagement</dt>
          <dd className="text-sm text-black">{formatCompactCount(totalEngagement(creator))}</dd>
        </div>
      </dl>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border-[3px] border-black bg-hot-pink text-sm font-extrabold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none"
      >
        View Creator →
      </Link>
      <Link
        href={`/api/creators/${creator.id}/instagram`}
        className="mt-2 text-center text-xs font-bold text-black underline"
      >
        Instagram →
      </Link>
    </article>
  );
}
