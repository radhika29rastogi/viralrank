import type { Metadata } from "next";
import { Suspense } from "react";
import { ArenaSubmitForm } from "@/components/creator/ArenaSubmitForm";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { DisplayHeadline } from "@/components/system";
import { MIN_HYPE_AMOUNT, MIN_RANKING_BID } from "@/lib/ranking";

export const metadata: Metadata = {
  title: "Submit a creator",
  description: "Paste an Instagram handle, preview the profile, then hype or bid — no account required.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <BrandLogo href="/" size="lg" className="justify-center sm:justify-start" />
        <div>
          <DisplayHeadline size="md" accent="Submit">
            Submit. Hype. Rank.
          </DisplayHeadline>
          <p className="mt-2 text-muted-foreground">
            Paste an Instagram URL. We fetch the real profile. New listings claim rank from ₹
            {MIN_RANKING_BID.toLocaleString("en-IN")}. Hype (₹{MIN_HYPE_AMOUNT.toLocaleString("en-IN")}+)
            is only for creators already on the ranking. No signup.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="font-bold">Loading submit…</p>}>
        <ArenaSubmitForm />
      </Suspense>
    </div>
  );
}
