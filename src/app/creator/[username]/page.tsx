import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, ColorBlock, DisplayHeadline } from "@/components/system";
import { BidButton } from "@/components/creator/BidButton";
import { HypeButton } from "@/components/creator/HypeButton";
import { CountUp } from "@/components/creator/CountUp";
import { TrackProfileClick } from "@/components/creator/TrackProfileClick";
import { minOvertakeAmount } from "@/lib/ranking";
import { formatNumber, siteUrl } from "@/lib/format";
import { getCreatorByUsername } from "@/lib/queries";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  const title = `@${username} — ViralRank.buzz`;
  return {
    title: `@${username}`,
    description: creator
      ? `${creator.name} on ViralRank.buzz — rank, hype, and paid support.`
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
          {creator.current_rank ? `#${creator.current_rank}` : "New"}
        </Badge>
        <Badge color="purple" float="tr" rotate={2}>
          {creator.categories?.name ?? "Other"}
        </Badge>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="size-40 overflow-hidden rounded-3xl border-[4px] border-black bg-sky">
            {creator.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.profile_image_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-5xl font-extrabold">
                {creator.name.slice(0, 1)}
              </div>
            )}
          </div>
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
              href={creator.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-bold text-black underline"
            >
              View Instagram →
            </a>
          </div>
        </div>
      </ColorBlock>

      <div className="grid gap-8 md:grid-cols-2">
        <ColorBlock color="yellow" padding="lg">
          <p className="text-sm font-extrabold uppercase text-black">Ranking</p>
          <p className="mt-2 text-4xl font-extrabold">#{creator.current_rank ?? "—"}</p>
          <p className="text-2xl font-extrabold">
            <CountUp value={bid} />
          </p>
          <p className="mt-2 text-sm text-neutral-700">Beat ₹{beat.toLocaleString("en-IN")} to take this rank</p>
        </ColorBlock>
        <ColorBlock color="pink" padding="lg">
          <p className="text-sm font-extrabold uppercase text-black">Community</p>
          <p className="mt-2 text-4xl font-extrabold">{creator.hype_count} hypes</p>
          <p className="text-2xl font-extrabold">
            <CountUp value={Number(creator.total_hype_amount) || 0} />
          </p>
          <p className="mt-2 text-sm text-neutral-700">Hype never changes rank</p>
        </ColorBlock>
      </div>

      <p className="text-sm text-neutral-500">Profile clicks: {creator.profile_clicks}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <HypeButton
          creatorId={creator.id}
          creatorName={creator.name}
          currentHighestBid={bid}
          label="Hype this creator — ₹49+"
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
