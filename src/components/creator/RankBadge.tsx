import { cn } from "@/lib/utils";

export function RankBadge({
  rank,
  className,
}: {
  rank: number | null;
  className?: string;
}) {
  const label = rank ? `#${rank}` : "NEW";
  return (
    <div
      className={cn(
        "font-display absolute -top-3 -left-3 z-10 rotate-[-8deg] rounded-full border-2 border-ink bg-lemon px-3 py-1 text-lg font-black chunky-shadow",
        rank === 1 && "bg-gold",
        className,
      )}
    >
      {label}
    </div>
  );
}
