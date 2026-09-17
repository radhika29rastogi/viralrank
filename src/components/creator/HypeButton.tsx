"use client";

import { useState } from "react";
import { FireIcon } from "@heroicons/react/24/solid";
import { BoldButton } from "@/components/system";
import { PaymentModal } from "@/components/creator/PaymentModal";
import { MIN_HYPE } from "@/lib/ranking";
import { formatCompactCount } from "@/lib/creator-stats";

export function HypeButton({
  creatorId,
  creatorName,
  instagramUsername,
  currentHighestBid,
  initialCount,
  label,
  compact = false,
}: {
  creatorId: string;
  creatorName: string;
  instagramUsername: string;
  currentHighestBid: number;
  initialCount?: number;
  initialRank?: number | null;
  label?: string;
  compact?: boolean;
  onUpdated?: (payload: { hypeCount: number; rank: number | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const countLabel =
    typeof initialCount === "number" ? ` · ${formatCompactCount(initialCount)}` : "";

  return (
    <>
      <BoldButton
        color="pink"
        fullWidth={!compact}
        className={compact ? "h-9 px-3 text-xs" : undefined}
        icon={<FireIcon className="size-4" />}
        onClick={() => setOpen(true)}
      >
        {label ?? (compact ? `Hype ₹${MIN_HYPE}+${countLabel}` : `Hype this creator ₹${MIN_HYPE}+`)}
      </BoldButton>
      <PaymentModal
        key={`${open}-hype`}
        open={open}
        onOpenChange={setOpen}
        kind="hype"
        creatorId={creatorId}
        creatorName={creatorName}
        instagramHandle={instagramUsername}
        currentHighestBid={currentHighestBid}
      />
    </>
  );
}
