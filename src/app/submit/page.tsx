import type { Metadata } from "next";
import { SubmitForm } from "@/components/creator/SubmitForm";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { DisplayHeadline } from "@/components/system";

export const metadata: Metadata = {
  title: "Rank a Creator",
  description: "Add an Instagram creator and pay ₹199 to publish on the ViralRank leaderboard.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <BrandLogo href="/" size="lg" className="justify-center sm:justify-start" />
        <div>
          <DisplayHeadline size="md" accent="Rank">
            Rank a Creator
          </DisplayHeadline>
          <p className="mt-2 text-neutral-500">
            Submit a creator, pay ₹199 to publish, then supporters can bid to rank them.
          </p>
        </div>
      </div>
      <SubmitForm />
    </div>
  );
}
