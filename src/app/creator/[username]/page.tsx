import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, ColorBlock, DisplayHeadline } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { HypeButton } from "@/components/creator/HypeButton";
import { CountUp } from "@/components/creator/CountUp";
import { TrackProfileClick } from "@/components/creator/TrackProfileClick";
import { JsonLd } from "@/components/seo/JsonLd";
import { displayRank, totalEngagement } from "@/lib/creator-engagement";
import { formatCompactCount } from "@/lib/creator-stats";
import { displayRankingScore } from "@/lib/arena/ranking";
import { HYPE_RANK_COPY, bidNeededForRank, minOvertakeAmount } from "@/lib/ranking";
import { formatNumber, siteUrl } from "@/lib/format";
import { getCreatorByUsername } from "@/lib/queries";

export const revalidate = 60;

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  const title = `@${username} — ViralRank.buzz`;
  return {
    title: `@${username}`,
    description: creator
      ? `${creator.name} (@${username}) on ViralRank.buzz — combined score ₹${Number(creator.combined_score || creator.ranking_score || creator.current_highest_bid || 0).toLocaleString("en-IN")}. Ranking bids and hype both count toward rank.`
      : `Creator @${username} on ViralRank.buzz`,
    openGraph: {
      title,
      description: creator
        ? `${creator.name} on ViralRank.buzz`
        : `Creator @${username} on ViralRank.buzz`,
      images: creator?.profile_image_url ? [{ url: creator.profile_image_url }] : undefined,
      url: `${siteUrl()}/creator/${username}`,
      type: "profile",
    },
  };
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) notFound();

  const bid = Number(creator.current_highest_bid) || 0;
  const hypeAmount = Number(creator.total_hype_amount || 0);
  const score = displayRankingScore(creator);
  const minNext = minOvertakeAmount(bid);
  const takeRank = creator.target_rank && creator.target_rank > 0 ? creator.target_rank : 1;
  const rival = Number(creator.rival_combined_score ?? score);
  const beat = bidNeededForRank(bid, hypeAmount, rival);
  const metricsLabel =
    creator.instagram_data_source === "instagram" ? "Instagram data" : "Creator-provided data";
  const origin = siteUrl();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: creator.name,
            alternateName: `@${creator.instagram_username}`,
            image: creator.profile_image_url || undefined,
            url: `${origin}/creator/${creator.instagram_username}`,
            description: creator.bio || `${creator.name} on ViralRank.buzz`,
          },
        }}
      />
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
            <p className="mt-2 text-muted-foreground">@{creator.instagram_username} · {creator.location}</p>
            {creator.bio ? <p className="mt-3 max-w-xl text-muted-foreground">{creator.bio}</p> : null}
            <p className="mt-3 text-sm text-muted-foreground">
              Followers {formatNumber(creator.followers)} · Avg views {formatNumber(creator.average_views)}
            </p>
            <div className="mt-3">
              <Badge color="yellow">{metricsLabel}</Badge>
            </div>
            <a
              href={`/api/creators/${creator.id}/instagram`}
              className="mt-4 inline-block text-sm font-bold text-foreground underline"
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
        <p className="text-sm font-extrabold uppercase text-foreground">Total engagement</p>
        <p className="mt-1 text-2xl font-extrabold">{formatCompactCount(totalEngagement(creator))}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {HYPE_RANK_COPY} Combined score <CountUp value={score} />. Minimum next bid: ₹
          {minNext.toLocaleString("en-IN")}. To reach #{takeRank}, you need a combined score above ₹
          {rival.toLocaleString("en-IN")}. Beat ₹{beat.toLocaleString("en-IN")} to take #{takeRank}.
        </p>
      </ColorBlock>

      <div className="grid gap-4 sm:grid-cols-2">
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          instagramUsername={creator.instagram_username}
          currentHighestBid={bid}
          initialCount={creator.hype_count}
        />
        <BidButton
          creatorId={creator.id}
          creatorName={creator.name}
          instagramUsername={creator.instagram_username}
          currentHighestBid={bid}
          totalHypeAmount={hypeAmount}
          rivalCombinedScore={rival}
          targetRank={takeRank}
          rank={creator.current_rank}
        />
      </div>
    </div>
  );
}
