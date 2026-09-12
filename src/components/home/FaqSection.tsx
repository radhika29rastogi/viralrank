"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { DisplayHeadline } from "@/components/system";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "What is ViralRank?",
    a: "ViralRank.buzz is a paid creator ranking arena. Paste an Instagram handle — no signup — we fetch the real profile, then you hype or bid. Highest verified rank bid holds the rank.",
  },
  {
    q: "How does the ranking work?",
    a: "Rank is the highest verified rank-bid payment in that category. First bid is ₹199. Overtaking #1 costs the current highest bid + ₹100. Hype never moves rank.",
  },
  {
    q: "How much does it cost to submit?",
    a: "Creator submissions can be made according to the current ViralRank pricing and bidding system. The minimum ranking bid is ₹199. Hype starts at ₹49 and never changes rank.",
  },
  {
    q: "Can I submit memes and videos?",
    a: "Yes. ViralRank supports multiple content categories including memes, videos, music, art, gaming, tech, fashion and lifestyle.",
  },
  {
    q: "How does Hype work?",
    a: "Hype allows users to support creators and content. The more verified hype a creator receives, the stronger their community support total becomes — it never changes rank by itself.",
  },
  {
    q: "Do I need followers to rank?",
    a: "No. ViralRank is designed around attention and community support, not simply follower count.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <DisplayHeadline as="h2" align="center" size="md" accent="friends">
        Questions you'd ask if we were friends.
      </DisplayHeadline>
      <div className="space-y-3">
        {ITEMS.map((item, i) => {
          const expanded = open === i;
          return (
            <div key={item.q} className="rounded-2xl border-[3px] border-border bg-card text-foreground shadow-[4px_4px_0_#000]">
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-button-${i}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-lg font-extrabold"
                  onClick={() => setOpen(expanded ? null : i)}
                >
                  {item.q}
                  {expanded ? <MinusIcon className="size-5 shrink-0" /> : <PlusIcon className="size-5 shrink-0" />}
                </button>
              </h3>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-button-${i}`}
                hidden={!expanded}
                className={cn("grid transition-all", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
              >
                {expanded ? (
                  <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground">{item.a}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
