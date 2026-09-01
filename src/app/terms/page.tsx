import type { Metadata } from "next";
import Link from "next/link";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { PLATFORM_NAME, SUPPORT_EMAIL } from "@/lib/copy/platform";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms and conditions for ${PLATFORM_NAME}.`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md">Terms & Conditions</DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="prose prose-neutral max-w-none space-y-4 text-sm leading-relaxed text-neutral-700">
        <p>Last updated: September 2026</p>
        <p>
          Welcome to {PLATFORM_NAME}. By accessing or using this platform, you agree to these Terms &
          Conditions.
        </p>
        <h2 className="text-lg font-extrabold text-black">1. Platform purpose</h2>
        <p>
          {PLATFORM_NAME} is a digital creator discovery platform that helps audiences discover social
          media creators across categories. Creators may submit profile information to be showcased on
          the platform.
        </p>
        <h2 className="text-lg font-extrabold text-black">2. Rankings</h2>
        <p>
          Creator rankings displayed on {PLATFORM_NAME} are determined independently based on platform
          criteria. Rankings are not sold, auctioned, or assigned in exchange for payment. Payments do
          not guarantee any specific ranking, ranking position, or #1 placement.
        </p>
        <h2 className="text-lg font-extrabold text-black">3. Premium digital services</h2>
        <p>
          {PLATFORM_NAME} may offer optional premium digital services such as enhanced creator profiles,
          profile visibility features, profile verification review, and promotional profile tools.
          Payments on the platform are solely for these digital services unless otherwise stated.
        </p>
        <h2 className="text-lg font-extrabold text-black">4. No auctions or pay-to-rank</h2>
        <p>
          {PLATFORM_NAME} does not operate auctions or bidding for creator ranking positions. Premium
          services relate to profile enhancement, visibility, promotional features, and related digital
          services — not the purchase of a ranking outcome.
        </p>
        <h2 className="text-lg font-extrabold text-black">5. Profile review</h2>
        <p>
          {PLATFORM_NAME} reserves the right to review, approve, reject, edit, or remove creator profiles
          at its discretion. Payment for premium services does not guarantee profile approval or
          publication.
        </p>
        <h2 className="text-lg font-extrabold text-black">6. No outcome guarantees</h2>
        <p>
          Paid services do not guarantee follower growth, engagement, brand deals, viral reach, or any
          specific ranking outcome.
        </p>
        <h2 className="text-lg font-extrabold text-black">7. Payments</h2>
        <p>
          Payments are processed through Razorpay or other authorized payment partners. {PLATFORM_NAME}{" "}
          does not store full card or banking credentials.
        </p>
        <h2 className="text-lg font-extrabold text-black">8. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or{" "}
          <Link href="/contact">Contact Us</Link>.
        </p>
      </ColorBlock>
    </div>
  );
}
