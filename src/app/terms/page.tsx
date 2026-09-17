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
      <ColorBlock color="cream" padding="lg" className="prose prose-neutral max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: September 2026</p>
        <p>
          Welcome to {PLATFORM_NAME}. By accessing or using this platform, you agree to these Terms &
          Conditions.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">1. Platform purpose</h2>
        <p>
          {PLATFORM_NAME} is a digital creator discovery platform that helps audiences discover social
          media creators across categories. Creators may submit profile information to be showcased on
          the platform.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">2. Rankings</h2>
        <p>
          Creator rankings on {PLATFORM_NAME} are ordered by combined score: the creator&apos;s highest
          verified rank-bid amount plus their total verified hype. Hype adds directly to a
          creator&apos;s score. Ranking bids and hype both count toward rank. If two creators have the
          same combined score, whichever reached that score first holds the higher position. A verified
          payment does not guarantee #1 if another creator&apos;s score is higher.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">3. Premium digital services</h2>
        <p>
          {PLATFORM_NAME} may offer optional premium digital services such as enhanced creator profiles,
          profile visibility features, profile verification review, and promotional profile tools.
          Payments on the platform are solely for these digital services unless otherwise stated.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">4. Rank bids and hype</h2>
        <p>
          Rank bids and hype payments are <strong>non-refundable</strong> regardless of final rank,
          including when another payment lands first and your bid is no longer enough to take #1.
          Hype adds directly to a creator&apos;s score. Ranking bids and hype both count toward rank.
          There is no account; a payer may later open a magic manage link emailed with their receipt.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">5. Profile review</h2>
        <p>
          {PLATFORM_NAME} reserves the right to review, approve, reject, edit, or remove creator profiles
          at its discretion. Payment for premium services does not guarantee profile approval or
          publication.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">6. No outcome guarantees</h2>
        <p>
          Paid services do not guarantee follower growth, engagement, brand deals, viral reach, or any
          specific ranking outcome.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">7. Payments</h2>
        <p>
          Payments are processed through Razorpay or other authorized payment partners. {PLATFORM_NAME}{" "}
          does not store full card or banking credentials.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">8. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or{" "}
          <Link href="/contact">Contact Us</Link>.
        </p>
      </ColorBlock>
    </div>
  );
}
