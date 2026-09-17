import Link from "next/link";
import { listedAgo } from "@/lib/arena/time";
import type { RankedCreator } from "@/lib/queries";
import { SmartImage } from "@/components/media/SmartImage";

export type { RankedCreator };

export function HomeRankList({ items }: { items: RankedCreator[] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border-[3px] border-border bg-card p-10 text-center font-extrabold text-foreground shadow-[4px_4px_0_#000]">
        No creators here yet. Be the first to claim #1. 🔥
      </div>
    );
  }

  return (
    <ol className="space-y-4" data-analytics="home_rank_list">
      {items.map((creator, index) => {
        const rank = creator.current_rank ?? index + 1;
        const clicks = Number(creator.instagram_clicks ?? creator.profile_clicks ?? 0);
        const category = creator.categories;
        return (
          <li
            key={creator.id}
            className="flex items-center gap-4 rounded-2xl border-[3px] border-border bg-card p-4 shadow-[4px_4px_0_#000]"
          >
            <span className="w-14 shrink-0 text-3xl font-extrabold text-hot-pink">#{rank}</span>
            <SmartImage
              src={creator.profile_image_url || "/viralrank-logo.jpg"}
              alt=""
              size="md"
              priority={index < 3}
              className="size-16 rounded-xl border-[3px] border-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-foreground">{creator.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {(creator.bio || "No bio yet.").slice(0, 90)}
                {(creator.bio || "").length > 90 ? "…" : ""}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                {category ? `${category.name}` : "Arena"} · {listedAgo(creator.published_at || creator.created_at)} · @
                {creator.instagram_username} · {clicks} clicks ·{" "}
                <Link href={`/creator/${creator.instagram_username}`} className="underline">
                  see details →
                </Link>
              </p>
            </div>
            <a
              href={`/api/creators/${creator.id}/instagram`}
              className="shrink-0 text-2xl font-extrabold text-hot-pink"
            >
              ₹{creator.rankAmount.toLocaleString("en-IN")}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
