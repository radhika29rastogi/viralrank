import { cn } from "@/lib/utils";

export function TugOfWarBar({
  leftBid,
  rightBid,
}: {
  leftBid: number;
  rightBid: number;
}) {
  const total = leftBid + rightBid;
  const leftPct = total === 0 ? 50 : (leftBid / total) * 100;
  const tilt = leftBid === rightBid ? 0 : leftBid > rightBid ? -2 : 2;

  return (
    <div className="space-y-2">
      <div
        className="relative h-8 overflow-hidden rounded-full border-4 border-ink bg-cream"
        style={{ transform: `rotate(${tilt}deg)` }}
        role="img"
        aria-label={`Bid tug of war. Left ₹${leftBid}, right ₹${rightBid}`}
      >
        <div
          className={cn("absolute inset-y-0 left-0 bg-gold transition-all")}
          style={{ width: `${leftPct}%` }}
        />
        <div className="absolute inset-y-0 right-0 bg-sky" style={{ width: `${100 - leftPct}%` }} />
        <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-black">
          VS
        </div>
      </div>
    </div>
  );
}
