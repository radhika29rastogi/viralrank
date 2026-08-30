"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { BoldButton } from "@/components/system";
import { PaymentModal } from "@/components/creator/PaymentModal";

export function HypeButton({
  creatorId,
  creatorName,
  currentHighestBid,
  label,
}: {
  creatorId: string;
  creatorName: string;
  currentHighestBid: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BoldButton color="pink" fullWidth icon={<Flame className="size-4" />} onClick={() => setOpen(true)}>
        {label ?? "Hype this creator"}
      </BoldButton>
      <PaymentModal
        key={`${open}-hype`}
        open={open}
        onOpenChange={setOpen}
        kind="hype"
        creatorId={creatorId}
        creatorName={creatorName}
        currentHighestBid={currentHighestBid}
      />
    </>
  );
}
