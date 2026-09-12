"use client";

import { BoldButton, ColorBlock, DisplayHeadline } from "@/components/system";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <ColorBlock color="cream" className="text-center">
        <DisplayHeadline as="h1" size="md" align="center">
          Something broke
        </DisplayHeadline>
        <p className="mt-3 font-bold text-muted-foreground">Try again, or go back to Explore.</p>
        <div className="mt-6 flex justify-center gap-3">
          <BoldButton type="button" color="pink" onClick={reset}>
            Try again
          </BoldButton>
          <BoldButton href="/explore" color="yellow">
            Explore
          </BoldButton>
        </div>
      </ColorBlock>
    </div>
  );
}
