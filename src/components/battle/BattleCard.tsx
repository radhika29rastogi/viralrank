import Link from "next/link";
import { FireIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { Badge, BoldButton, ColorBlock } from "@/components/system";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { HypeButton } from "@/components/creator/HypeButton";
import { formatCompactCount } from "@/lib/creator-stats";
import { displayRank } from "@/lib/creator-engagement";
import type { Creator } from "@/types/database";

const panelTone = ["from-hot-pink to-coral", "from-sky to-lavender"];

function VsBadge() {
  return (
    <>
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 hidden size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-black bg-ink text-lg font-extrabold text-cream shadow-[4px_4px_0_#000] md:flex">
        VS
      </div>
      <div className="flex justify-center md:hidden">
        <span className="flex size-14 items-center justify-center rounded-full border-[4px] border-black bg-ink text-sm font-extrabold text-cream shadow-[4px_4px_0_#000]">
          VS
        </span>
      </div>
    </>
  );
}

function Panel({ creator, tone }: { creator: Creator; tone: string }) {
  const hype = Number(creator.hype_count) || 0;
  const rankLabel = displayRank(creator.current_rank) ?? "—";

  return (
    <div className={`relative flex min-h-64 flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-gradient-to-br ${tone}`}>
      <span className="absolute top-3 left-3 z-10 rounded-full border-[3px] border-black bg-cream px-3 py-1 text-xs font-extrabold uppercase">
        {rankLabel}
      </span>
      <span className="absolute top-3 right-3 z-10 rounded-full border-[3px] border-black bg-cream px-3 py-1 text-xs font-extrabold uppercase">
        @{creator.instagram_username}
      </span>
      <Link
        href={`/creator/${creator.instagram_username}`}
        className="flex flex-1 flex-col items-center justify-center gap-2 pt-12"
      >
        <CreatorAvatar name={creator.name} imageUrl={creator.profile_image_url} size="lg" />
        <p className="text-center text-sm font-extrabold text-black">{creator.name}</p>
      </Link>
      <div className="space-y-2 border-t-[3px] border-black bg-cream px-3 py-3">
        <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-black">
          <FireIcon className="size-5 text-hot-pink" />
          {formatCompactCount(hype)} HYPE
        </p>
        <p className="text-center text-xs font-semibold text-neutral-500">
          👀 {formatCompactCount(creator.profile_clicks)} views · IG {formatCompactCount(creator.instagram_clicks ?? 0)}
        </p>
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={Number(creator.current_highest_bid) || 0}
          initialCount={hype}
          compact
        />
      </div>
    </div>
  );
}

function GhostPanel({ label }: { label: string }) {
  return (
    <div className="relative flex min-h-64 flex-col overflow-hidden rounded-2xl border-[3px] border-dashed border-black/50 bg-neutral-200/70">
      <span className="absolute top-3 left-3 z-10 rounded-full border-[3px] border-dashed border-black/40 bg-cream px-3 py-1 text-xs font-extrabold uppercase text-neutral-400">
        {label}
      </span>
      <div className="flex flex-1 items-center justify-center pt-10">
        <span className="flex size-24 items-center justify-center rounded-full border-[3px] border-dashed border-black/30 bg-neutral-300 text-4xl text-neutral-400">
          ?
        </span>
      </div>
      <div className="border-t-[3px] border-dashed border-black/40 bg-cream/80 px-3 py-2 text-center">
        <p className="text-sm font-extrabold text-neutral-400">Waiting for challenger</p>
      </div>
    </div>
  );
}

export function BattleCard({
  one,
  two,
  showNewOne,
}: {
  one: Creator;
  two: Creator;
  showNewOne?: boolean;
}) {
  const totalHype = (Number(one.hype_count) || 0) + (Number(two.hype_count) || 0);

  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      <Badge color="pink" rotate={-2} float="tl" icon="⚔️">
        Live battle
      </Badge>
      <Badge color={showNewOne ? "lime" : "blue"} rotate={2} float="tr" icon={showNewOne ? "🔥" : "●"}>
        {showNewOne ? "New #1" : "Live"}
      </Badge>

      <div className="relative mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel creator={one} tone={panelTone[0]} />
        <Panel creator={two} tone={panelTone[1]} />
        <VsBadge />
      </div>

      <div className="mt-6 flex justify-center gap-8 text-sm font-semibold text-neutral-600">
        <span className="inline-flex items-center gap-2">
          <TrophyIcon className="size-4" />
          {displayRank(one.current_rank)} · {formatCompactCount(one.hype_count)} hype
        </span>
        <span className="inline-flex items-center gap-2">
          <FireIcon className="size-4 text-hot-pink" />
          {formatCompactCount(totalHype)} total hype
        </span>
        <span className="inline-flex items-center gap-2">
          <TrophyIcon className="size-4" />
          {displayRank(two.current_rank)} · {formatCompactCount(two.hype_count)} hype
        </span>
      </div>
    </ColorBlock>
  );
}

export function DefendingChampion({ creator }: { creator: Creator }) {
  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      <Badge color="pink" rotate={-2} float="tl" icon="👑">
        #1 live
      </Badge>
      <Badge color="lime" rotate={2} float="tr" icon="🔥">
        Defending #1 — no one&apos;s challenged yet
      </Badge>
      <div className="relative mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel creator={creator} tone={panelTone[0]} />
        <GhostPanel label="@challenger" />
        <VsBadge />
      </div>
      <p className="wait-pulse mt-6 text-center text-sm font-extrabold uppercase text-neutral-500">
        Waiting for challenger
      </p>
      <div className="mt-6">
        <BoldButton href="/submit" color="yellow" size="lg" fullWidth>
          Challenge for #2
        </BoldButton>
      </div>
    </ColorBlock>
  );
}

export function EmptyBattle() {
  return (
    <ColorBlock color="cream" padding="lg" className="overflow-visible">
      <Badge color="pink" rotate={-2} float="tl" icon="⚔️">
        Live battle
      </Badge>
      <Badge color="yellow" rotate={2} float="tr">
        Open slot
      </Badge>
      <div className="relative mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GhostPanel label="@???" />
        <GhostPanel label="@???" />
        <VsBadge />
      </div>
      <p className="wait-pulse mt-6 text-center text-sm font-extrabold uppercase text-neutral-500">
        Waiting for challenger
      </p>
      <div className="mt-6">
        <BoldButton href="/submit" color="yellow" size="lg" fullWidth>
          Be the First #1
        </BoldButton>
      </div>
    </ColorBlock>
  );
}

export function ArenaBattle({
  leaders,
  showNewOne,
}: {
  leaders: Creator[];
  showNewOne?: boolean;
}) {
  if (leaders.length >= 2) {
    return <BattleCard one={leaders[0]} two={leaders[1]} showNewOne={showNewOne} />;
  }
  if (leaders.length === 1) {
    return <DefendingChampion creator={leaders[0]} />;
  }
  return <EmptyBattle />;
}
