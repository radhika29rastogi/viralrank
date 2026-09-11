import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, ColorBlock, DisplayHeadline } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { HypeButton } from "@/components/creator/HypeButton";
import { CountUp } from "@/components/creator/CountUp";
import { TrackProfileClick } from "@/components/creator/TrackProfileClick";
import { displayRank, totalEngagement } from "@/lib/creator-engagement";
import { formatCompactCount } from "@/lib/creator-stats";
import { minOvertakeAmount } from "@/lib/ranking";
import { formatNumber, siteUrl } from "@/lib/format";
import { getCreatorByUsername } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  const title = `@${username} — ViralRank.buzz`;
  return {
    title: `@${username}`,
    description: creator
      ? `${creator.name} on ViralRank.buzz — rank, hype, and community support.`
      : `Creator @${username} on ViralRank.buzz`,
    openGraph: {
      title,
      images: creator?.profile_image_url ? [{ url: creator.profile_image_url }] : undefined,
      url: `${siteUrl()}/creator/${username}`,
    },
  };
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) notFound();

  const bid = Number(creator.current_highest_bid) || 0;
  const beat = minOvertakeAmount(bid);
  const metricsLabel =
    creator.instagram_data_source === "instagram" ? "Instagram data" : "Creator-provided data";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <TrackProfileClick creatorId={creator.id} />
      <ColorBlock color="cream" padding="lg">
        <Badge color="yellow" float="tl" rotate={-2}>
          {displayRank(creator.current_rank) ?? "New"}
        </Badge>
        <Badge color="purple" float="tr" rotate={2}>
          {creator.categories?.name ?? "Other"}
        </Badge>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
          <CreatorAvatar name={creator.name} imageUrl={creator.profile_image_url} size="xl" />
          <div>
            <DisplayHeadline as="h1" size="md">
              {creator.name}
            </DisplayHeadline>
            <p className="mt-2 text-neutral-500">@{creator.instagram_username} · {creator.location}</p>
            {creator.bio ? <p className="mt-3 max-w-xl text-neutral-600">{creator.bio}</p> : null}
            <p className="mt-3 text-sm text-neutral-500">
              Followers {formatNumber(creator.followers)} · Avg views {formatNumber(creator.average_views)}
            </p>
            <div className="mt-3">
              <Badge color="yellow">{metricsLabel}</Badge>
            </div>
            <a
              href={`/api/creators/${creator.id}/instagram`}
              className="mt-4 inline-block text-sm font-bold text-black underline"
            >
              View Instagram →
            </a>
          </div>
        </div>
      </ColorBlock>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorBlock color="yellow" padding="md">
          <p className="text-xs font-extrabold uppercase">Rank</p>
          <p className="mt-1 text-3xl font-extrabold">{displayRank(creator.current_rank) ?? "—"}</p>
        </ColorBlock>
        <ColorBlock color="pink" padding="md">
          <p className="text-xs font-extrabold uppercase">🔥 Hype</p>
          <p className="mt-1 text-3xl font-extrabold">{formatCompactCount(creator.hype_count)}</p>
        </ColorBlock>
        <ColorBlock color="lime" padding="md">
          <p className="text-xs font-extrabold uppercase">👀 Profile views</p>
          <p className="mt-1 text-3xl font-extrabold">{formatCompactCount(creator.profile_clicks)}</p>
        </ColorBlock>
        <ColorBlock color="blue" padding="md">
          <p className="text-xs font-extrabold uppercase">Instagram clicks</p>
          <p className="mt-1 text-3xl font-extrabold">{formatCompactCount(creator.instagram_clicks ?? 0)}</p>
        </ColorBlock>
      </div>

      <ColorBlock color="cream" padding="md">
        <p className="text-sm font-extrabold uppercase text-black">Total engagement</p>
        <p className="mt-1 text-2xl font-extrabold">{formatCompactCount(totalEngagement(creator))}</p>
        <p className="mt-2 text-sm text-neutral-600">
          Rank is calculated server-side from hype and engagement. Ranking bid:{" "}
          <CountUp value={bid} /> · Beat ₹{beat.toLocaleString("en-IN")} to raise bid rank weight.
        </p>
      </ColorBlock>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
