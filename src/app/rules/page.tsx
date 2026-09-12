import type { Metadata } from "next";
import Link from "next/link";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = {
  title: "Rules",
  description: "How ViralRank bids, hype, and ranks work.",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
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
          First bid on a new creator is ₹199. To overtake the current #1 in that category, pay the
          current highest verified bid + ₹100. The highest verified rank bid holds the rank.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Hype</h2>
        <p>Hype is ₹49 minimum, any amount above, unlimited times. It never changes rank.</p>
        <h2 className="text-lg font-extrabold text-foreground">Payments</h2>
        <p>
          Rank bids and hype are <strong>non-refundable</strong> regardless of final rank. If two people
          try to overtake at the same time and another payment lands first, your payment can still
          verify without taking #1.
        </p>
        <h2 className="text-lg font-extrabold text-foreground">Today vs all-time</h2>
        <p>
          The Today filter uses verified rank bids since midnight IST. All-time uses every verified rank
          bid.
        </p>
        <p>
          Full legal text: <Link href="/terms" className="font-bold underline">Terms</Link>.
        </p>
      </ColorBlock>
    </div>
  );
}
