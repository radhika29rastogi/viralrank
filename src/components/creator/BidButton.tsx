"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { BoldButton } from "@/components/system";
import { PaymentModal } from "@/components/creator/PaymentModal";
import { minOvertakeAmount } from "@/lib/ranking";

export function BidButton({
  creatorId,
  creatorName,
  currentHighestBid,
  rank,
  label,
}: {
  creatorId: string;
  creatorName: string;
  currentHighestBid: number;
  rank?: number | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const min = minOvertakeAmount(currentHighestBid);
  return (
    <>
      <BoldButton
        color="yellow"
        size="lg"
        fullWidth
        icon={<Trophy className="size-4" />}
        onClick={() => setOpen(true)}
      >
        {label ?? `Beat ₹${min.toLocaleString("en-IN")}${rank ? ` to take #${rank}` : ""}`}
      </BoldButton>
      <PaymentModal
        key={`${open}-bid-${currentHighestBid}`}
        open={open}
        onOpenChange={setOpen}
        kind="ranking_bid"
        creatorId={creatorId}
        creatorName={creatorName}
        currentHighestBid={currentHighestBid}
      />
    </>
  );
}
