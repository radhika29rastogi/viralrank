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
          <h2 className="mt-2 text-4xl font-extrabold text-on-accent">HYPE — ₹49+</h2>
          <p className="mt-3 text-on-accent/80">
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
          <h2 className="mt-2 text-4xl font-extrabold text-on-accent">RANKING BID — ₹199+</h2>
          <p className="mt-3 text-on-accent/80">
            First bid ₹199. To overtake, pay current highest bid + ₹100. Highest verified payment holds #1.
          </p>
          <div className="mt-6">
            <BoldButton href="/submit" color="pink" size="lg">
              🏆 Rank a Creator
            </BoldButton>
          </div>
        </ColorBlock>
        <ColorBlock color="lime" padding="lg" className="md:col-span-2">
          <p className="text-sm font-extrabold uppercase">Standard Checkout</p>
          <h2 className="mt-2 text-4xl font-extrabold text-on-accent">CHECKOUT — ₹1+</h2>
          <p className="mt-3 text-on-accent/80">
            Open Razorpay Standard Checkout (order → modal → HMAC verify). Listing and hype still use
            their dedicated payment flows.
          </p>
          <div className="mt-6">
            <BoldButton href="/checkout" color="yellow" size="lg">
              Pay with Razorpay
            </BoldButton>
          </div>
        </ColorBlock>
      </div>
    </div>
  );
}
