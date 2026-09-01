import type { Metadata } from "next";
import Link from "next/link";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { PLATFORM_NAME, SUPPORT_EMAIL } from "@/lib/copy/platform";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: `Refund and cancellation policy for ${PLATFORM_NAME} digital services.`,
};

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md">Refund & Cancellation Policy</DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-4 text-sm leading-relaxed text-neutral-700">
        <p>Last updated: September 2026</p>
        <p>
          This policy applies to optional premium digital services purchased on {PLATFORM_NAME}, including
          enhanced creator profiles, visibility features, verification review, and promotional tools.
        </p>
        <h2 className="text-lg font-extrabold text-black">Cancellation before processing</h2>
        <p>
          You may request cancellation before your premium digital service has been processed (for example,
          before profile review or promotional setup has begun). Contact us promptly with your order
          details.
        </p>
        <h2 className="text-lg font-extrabold text-black">After service processing begins</h2>
        <p>
          Once profile review, profile enhancement, promotional setup, or other digital services have
          started, refunds may be limited or unavailable because the service is in progress or delivered.
        </p>
        <h2 className="text-lg font-extrabold text-black">Duplicate or accidental payments</h2>
        <p>Duplicate or accidental payments will be reviewed on a case-by-case basis.</p>
        <h2 className="text-lg font-extrabold text-black">How to request a refund</h2>
        <p>
          Submit refund requests through the <Link href="/contact">Contact Us</Link> page or email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your name, email, payment reference,
          and reason for the request.
        </p>
        <h2 className="text-lg font-extrabold text-black">Processing timeframe</h2>
        <p>
          Approved refunds are processed within a reasonable timeframe, typically 7–14 business days, via
          the original payment method where possible.
        </p>
        <h2 className="text-lg font-extrabold text-black">No ranking guarantees</h2>
        <p>
          Refunds are not available on the basis of ranking outcomes. Premium services do not guarantee
          any specific ranking position.
        </p>
      </ColorBlock>
    </div>
  );
}
