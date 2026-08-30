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
        <p className="text-neutral-600">
          ViralRank is a creator discovery + paid ranking + hype platform. Anyone can add an Instagram
          creator. Rank is only the highest verified ranking bid. Hype is separate community support
          and never moves the leaderboard.
        </p>
      </ColorBlock>
      <Disclaimer />
      <p className="text-neutral-500">
        Instagram stats are optional. When Meta Graph API Business Discovery returns them, they are
        labeled as Instagram data. Anything typed by a submitter is labeled as creator-provided. We
        do not invent follower counts. Personal Instagram accounts cannot be looked up automatically.
      </p>
    </div>
  );
}
