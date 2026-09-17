import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorBlock, DisplayHeadline, BoldButton } from "@/components/system";
import { formatInr, formatNumber } from "@/lib/format";
import { bidNeededForRank, MIN_HYPE_AMOUNT, minOvertakeAmount } from "@/lib/ranking";
import { getCreatorByEditToken } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage listing",
  robots: { index: false, follow: false },
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 32) notFound();
  const creator = await getCreatorByEditToken(token);
  if (!creator) notFound();

  const bid = Number(creator.current_rank_bid || creator.current_highest_bid || 0);
  const hypeAmount = Number(creator.total_hype_amount || 0);
  const rival = Number(creator.rival_combined_score ?? bid + hypeAmount);
  const takeRank = creator.target_rank && creator.target_rank > 0 ? creator.target_rank : 1;
  const nextBid = bidNeededForRank(bid, hypeAmount, rival);
  const minNext = minOvertakeAmount(bid);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="listing">
        Manage this listing
      </DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-3">
        <p className="text-2xl font-extrabold">{creator.name}</p>
        <p className="font-bold">@{creator.instagram_username}</p>
        <p className="text-sm text-muted-foreground">
          Followers {formatNumber(creator.followers)} · Current rank bid {formatInr(bid)} · Hype{" "}
          {formatInr(hypeAmount)} · Minimum next bid {formatInr(minNext)}
        </p>
        <p className="text-sm text-muted-foreground">
          This page is tied to a random token from your payment receipt. There is no login. Do not share
          this link.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <BoldButton
            href={`/submit?handle=${encodeURIComponent(creator.instagram_username)}&intent=rank_bid&amount=${nextBid}`}
            color="pink"
          >
            Bid again · {formatInr(nextBid)} to take #{takeRank}
          </BoldButton>
          <BoldButton
            href={`/submit?handle=${encodeURIComponent(creator.instagram_username)}&intent=hype`}
            color="yellow"
          >
            Add hype · ₹{MIN_HYPE_AMOUNT.toLocaleString("en-IN")}+
          </BoldButton>
        </div>
        <Link href={`/creator/${creator.instagram_username}`} className="inline-block text-sm font-bold underline">
          View public page →
        </Link>
      </ColorBlock>
    </div>
  );
}
