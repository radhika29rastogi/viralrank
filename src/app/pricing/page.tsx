import type { Metadata } from "next";
import { BoldButton, ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Hype from ₹49. Ranking bids from ₹199.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Pricing">
        Simple Pricing
      </DisplayHeadline>
      <div className="grid gap-8 md:grid-cols-2">
        <ColorBlock color="pink" padding="lg">
          <p className="text-sm font-extrabold uppercase">Casual support</p>
          <h2 className="mt-2 text-4xl font-extrabold text-black">HYPE — ₹49+</h2>
          <p className="mt-3 text-neutral-800">
            Support a creator. Unlimited uses. No rank impact, even at ₹10,000.
          </p>
          <div className="mt-6">
            <BoldButton href="/explore" color="yellow" size="lg">
              🔥 Hype a Creator
            </BoldButton>
          </div>
        </ColorBlock>
        <ColorBlock color="yellow" padding="lg">
          <p className="text-sm font-extrabold uppercase">Take the rank</p>
          <h2 className="mt-2 text-4xl font-extrabold text-black">RANKING BID — ₹199+</h2>
          <p className="mt-3 text-neutral-800">
            First bid ₹199. To overtake, pay current highest bid + ₹100. Highest verified payment holds #1.
          </p>
          <div className="mt-6">
            <BoldButton href="/submit" color="pink" size="lg">
              🏆 Rank a Creator
            </BoldButton>
          </div>
        </ColorBlock>
      </div>
    </div>
  );
}
