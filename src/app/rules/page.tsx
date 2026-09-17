import type { Metadata } from "next";
import Link from "next/link";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { JsonLd } from "@/components/seo/JsonLd";
import { MIN_HYPE_AMOUNT, MIN_RANKING_BID } from "@/lib/ranking";
import { FAQ_ITEMS } from "@/lib/copy/faq";

export const metadata: Metadata = {
  title: "Rules",
  description: "How ViralRank ranking bids, hype, combined score, and the daily battle work.",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <DisplayHeadline size="md" accent="Rules">
        Arena rules
      </DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          ViralRank is a paid creator ranking arena. There is no signup. Anyone can paste an Instagram
          handle, we fetch the live profile, and Razorpay collects payment.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Rank bids</h2>
        <p>
          First bid on a new creator is ₹{MIN_RANKING_BID.toLocaleString("en-IN")}. Every new bid on that creator must be at least the
          current highest bid + ₹100. A creator&apos;s overall rank is decided by their{" "}
          <strong>combined score</strong> — their highest verified rank bid plus their total verified
          hype. Highest combined score holds the higher rank.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Hype</h2>
        <p>
          Hype is ₹{MIN_HYPE_AMOUNT.toLocaleString("en-IN")} minimum, any amount above, unlimited times. Hype adds directly to a
          creator&apos;s combined score alongside their ranking bid — it changes rank.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Ties</h2>
        <p>
          If two creators have an equal combined score, whichever reached that score first (by
          verified payment timestamp) holds the higher position.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Combined score</h2>
        <p>
          combined_score = highest verified rank bid + total verified hype. Coupon discounts change
          what Razorpay charges, not the ranked amount. Pending, failed, cancelled, refunded, or
          unverified payments do not count.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Daily Battle</h2>
        <p>
          Every day at 8:00 PM IST, the current live battle (#1 vs #2) is scored by hype received
          that day. Whoever got more hype wins the day. If neither creator received hype, the
          winner is decided by profile visits, clicks, and engagement instead.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Payments</h2>
        <p>
          Rank bids and hype are <strong>non-refundable</strong> regardless of final rank. If two people
          try to overtake at the same time and another payment lands first, your payment can still
          verify without taking #1.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Today vs all-time</h2>
        <p>
          The Today filter uses verified rank bids and hype since midnight IST, scored with the same
          ranking formula. All-time uses every verified payment.
        </p>
        <p>
          Full legal text: <Link href="/terms" className="font-bold underline">Terms</Link>.
        </p>
      </ColorBlock>
    </div>
  );
}
