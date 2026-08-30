import Link from "next/link";
import { Badge } from "@/components/system";
import { formatCompactCount, viralScore } from "@/lib/creator-stats";
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
  const score = creator.id.startsWith("demo-")
    ? Math.round(Number(creator.current_highest_bid) / 20)
    : viralScore(creator);
  const hype = Number(creator.total_hype_amount) || creator.hype_count || 0;
  const rotate = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const href = creator.id.startsWith("demo-")
    ? "/submit"
    : `/creator/${creator.instagram_username}`;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-3xl border-[4px] border-black p-4 shadow-[4px_4px_0_#000]",
        pastels[index % pastels.length],
        rotate,
      )}
    >
      <Badge color="yellow" className="absolute top-3 right-3 z-10" rotate={2}>
        {creator.current_rank ? `#${creator.current_rank}` : "New"}
      </Badge>
      <div className="mx-auto size-28 overflow-hidden rounded-full border-[4px] border-black bg-cream">
        {creator.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.profile_image_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl font-extrabold">
            {creator.name.slice(0, 1)}
          </div>
        )}
      </div>
      <p className="mt-4 truncate text-center text-lg font-extrabold text-black">
        @{creator.instagram_username}
      </p>
      <p className="text-center text-sm font-bold text-black/70">{category}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div>
          <dt className="text-black/60">Followers</dt>
          <dd className="text-sm text-black">{formatCompactCount(creator.followers)}</dd>
        </div>
        <div>
          <dt className="text-black/60">🔥 Viral Score</dt>
          <dd className="text-sm text-black">{score}</dd>
        </div>
        <div>
          <dt className="text-black/60">Hype</dt>
          <dd className="text-sm text-black">{formatCompactCount(hype)}</dd>
        </div>
      </dl>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border-[3px] border-black bg-hot-pink text-sm font-extrabold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none"
      >
        View Creator →
      </Link>
    </article>
  );
}
