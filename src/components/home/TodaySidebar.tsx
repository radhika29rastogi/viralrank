import Link from "next/link";
import type { RankedCreator } from "@/components/home/HomeRankList";
import { SmartImage } from "@/components/media/SmartImage";

export function TodaySidebar({ items }: { items: RankedCreator[] }) {
  return (
    <aside className="h-fit rounded-2xl border-[3px] border-border bg-card p-4 text-foreground shadow-[4px_4px_0_#000] lg:sticky lg:top-24">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <span className="size-2 rounded-full bg-lime" />
          Today&apos;s ranking
        </p>
        <Link href="/rankings?range=today" className="text-xs font-bold underline">
          See all →
        </Link>
      </div>
      <ol className="space-y-2">
        {items.slice(0, 8).map((creator, index) => (
          <li key={creator.id} className="flex items-center gap-2">
            <span className="w-6 text-xs font-extrabold">#{index + 1}</span>
            <SmartImage
              src={creator.profile_image_url || "/viralrank-logo.jpg"}
              size="sm"
              className="size-7 rounded-full border-2 border-border"
            />
            <Link href={`/creator/${creator.instagram_username}`} className="min-w-0 flex-1 truncate text-sm font-bold">
              {creator.name}
            </Link>
            <span className="text-sm font-extrabold text-hot-pink">
              ₹{creator.rankAmount.toLocaleString("en-IN")}
            </span>
          </li>
        ))}
        {!items.length ? <li className="text-sm font-bold text-muted-foreground">Nothing paid today yet.</li> : null}
      </ol>
    </aside>
  );
}
