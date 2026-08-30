import { Badge, ColorBlock } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { CountUp } from "@/components/creator/CountUp";
import type { Creator } from "@/types/database";

export function ThroneCard({ creator }: { creator: Creator }) {
  const bid = Number(creator.current_highest_bid) || 0;
  return (
    <ColorBlock color="yellow" padding="lg">
      <Badge color="pink" float="tl" rotate={-2} icon="👑">
        #1 today
      </Badge>
      <Badge color="blue" float="tr" rotate={2}>
        Throne
      </Badge>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="size-28 overflow-hidden rounded-3xl border-[4px] border-black bg-sky">
          {creator.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.profile_image_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-extrabold">
              {creator.name.slice(0, 1)}
            </div>
          )}
        </div>
        <p className="mt-4 text-3xl font-extrabold text-black">{creator.name}</p>
        <p className="text-sm text-neutral-600">@{creator.instagram_username}</p>
        <p className="mt-4 text-5xl font-extrabold text-black">
          <CountUp value={bid} />
        </p>
        <div className="mt-6 w-full max-w-sm">
          <BidButton
            creatorId={creator.id}
            creatorName={creator.name}
            currentHighestBid={bid}
            rank={creator.current_rank}
          />
        </div>
      </div>
    </ColorBlock>
  );
}
