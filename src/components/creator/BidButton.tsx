"use client";

import { useState } from "react";
import { TrophyIcon } from "@heroicons/react/24/solid";
import { BoldButton } from "@/components/system";
import { PaymentModal } from "@/components/creator/PaymentModal";
import { bidNeededForRank } from "@/lib/ranking";

export function BidButton({
  creatorId,
  creatorName,
  instagramUsername,
  currentHighestBid,
  totalHypeAmount = 0,
  rivalCombinedScore,
  targetRank,
  rank,
  label,
}: {
  creatorId: string;
  creatorName: string;
  instagramUsername: string;
  currentHighestBid: number;
  totalHypeAmount?: number;
  rivalCombinedScore?: number | null;
  targetRank?: number | null;
  rank?: number | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const takeRank = targetRank && targetRank > 0 ? targetRank : rank && rank > 1 ? rank - 1 : 1;
  const rival = Number(
    rivalCombinedScore ?? currentHighestBid + totalHypeAmount,
  );
  const beat = bidNeededForRank(currentHighestBid, totalHypeAmount, rival);
  return (
    <>
      <BoldButton
        color="yellow"
        size="lg"
        fullWidth
        icon={<TrophyIcon className="size-4" />}
        onClick={() => setOpen(true)}
      >
        {label ?? `Beat ₹${beat.toLocaleString("en-IN")} to take #${takeRank}`}
      </BoldButton>
      <PaymentModal
        key={`${open}-bid-${currentHighestBid}-${beat}`}
        open={open}
        onOpenChange={setOpen}
        kind="ranking_bid"
        creatorId={creatorId}
        creatorName={creatorName}
        instagramHandle={instagramUsername}
        currentHighestBid={currentHighestBid}
        totalHypeAmount={totalHypeAmount}
        rivalCombinedScore={rival}
        targetRank={takeRank}
        suggestedAmount={beat}
      />
    </>
  );
}
