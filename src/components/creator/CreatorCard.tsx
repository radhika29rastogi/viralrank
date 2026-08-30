import Link from "next/link";
import { Badge, ColorBlock } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { HypeButton } from "@/components/creator/HypeButton";
import { CountUp } from "@/components/creator/CountUp";
import type { Creator } from "@/types/database";

export function CreatorCard({
  creator,
}: {
  creator: Creator;
  index?: number;
}) {
  const category = creator.categories?.name ?? "Other";
  const bid = Number(creator.current_highest_bid) || 0;

  return (
    <ColorBlock color="cream" padding="md">
      <Badge color="yellow" float="tl" rotate={-2}>
        {creator.current_rank ? `#${creator.current_rank}` : "New"}
      </Badge>
      <Badge color="purple" float="tr" rotate={2}>
        {category}
      </Badge>

      <div className="mt-4 flex items-center gap-3">
        <div className="size-16 overflow-hidden rounded-2xl border-[3px] border-black bg-sky">
          {creator.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.profile_image_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xl font-extrabold">
              {creator.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-black">{creator.name}</p>
          <p className="truncate text-sm text-neutral-500">@{creator.instagram_username}</p>
        </div>
      </div>

      <p className="mt-4 text-3xl font-extrabold text-black">
        <CountUp value={bid} />
      </p>
      <p className="text-sm text-neutral-500">Current ranking bid</p>

      <div className="mt-4 flex flex-col gap-2">
        <BidButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={bid}
          rank={creator.current_rank}
        />
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={bid}
        />
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
