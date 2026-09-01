import type { Metadata } from "next";
import Link from "next/link";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { PLATFORM_NAME, SUPPORT_EMAIL } from "@/lib/copy/platform";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${PLATFORM_NAME}.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md">Privacy Policy</DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-4 text-sm leading-relaxed text-neutral-700">
        <p>Last updated: September 2026</p>
        <p>
          This Privacy Policy explains how {PLATFORM_NAME} collects, uses, and protects information when
          you use our website and services.
        </p>
        <h2 className="text-lg font-extrabold text-black">Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Creator profile details you submit (name, Instagram username, bio, category, location, etc.)</li>
          <li>Contact information (email, optional phone)</li>
          <li>Account information if you sign up or sign in</li>
          <li>Payment transaction references processed through Razorpay (we do not store card or banking details)</li>
          <li>Usage data such as page views and profile clicks</li>
        </ul>
        <h2 className="text-lg font-extrabold text-black">How we use information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Display creator profiles and operate the discovery platform</li>
          <li>Process premium profile service purchases</li>
          <li>Review and moderate submitted profiles</li>
          <li>Respond to support requests</li>
          <li>Improve platform security and performance</li>
        </ul>
        <h2 className="text-lg font-extrabold text-black">Payment processing</h2>
        <p>
          Payments are handled by Razorpay. Sensitive payment credentials are processed by the payment
          gateway and are not stored on {PLATFORM_NAME} servers.
        </p>
        <h2 className="text-lg font-extrabold text-black">Cookies & analytics</h2>
        <p>
          We may use cookies and similar technologies for session management, security, and aggregated
          analytics. You can control cookies through your browser settings.
        </p>
        <h2 className="text-lg font-extrabold text-black">Your rights</h2>
        <p>
          You may request access, correction, or deletion of your personal information by contacting{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <h2 className="text-lg font-extrabold text-black">Contact</h2>
        <p>
          <Link href="/contact">Contact Us</Link> · {SUPPORT_EMAIL}
        </p>
      </ColorBlock>
    </div>
  );
}
