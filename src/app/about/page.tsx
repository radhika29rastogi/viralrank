import type { Metadata } from "next";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = {
  title: "About",
  description: "What ViralRank.buzz is — and what a rank is not.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="ViralRank">
        About ViralRank
      </DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <p className="text-muted-foreground">
          ViralRank is a paid creator ranking arena. Paste an Instagram handle — no signup — and we
          fetch the display name, photo, and follower count from a third-party Instagram data API.
          Rank is combined score: highest verified rank bid plus verified hype. Hype adds directly to
          a creator&apos;s score. Ranking bids and hype both count toward rank. Coupons discount the
          charge, not the ranked amount.
        </p>
      </ColorBlock>
      <Disclaimer />
      <p className="text-muted-foreground">
        If we cannot fetch the Instagram profile, we will not let you submit empty or invented stats.
        After payment, a magic manage link is emailed with the receipt — there is no account area.
      </p>
    </div>
  );
}
