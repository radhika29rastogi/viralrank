import type { Creator } from "@/types/database";

export function viralScore(creator: Creator) {
  const hype = Number(creator.total_hype_amount) || 0;
  const clicks = creator.profile_clicks || 0;
  const followers = creator.followers || 0;
  const bid = Number(creator.current_highest_bid) || 0;
  const raw =
    Math.log10(hype + 1) * 14 +
    Math.log10(followers + 1) * 10 +
    Math.log10(bid + 1) * 8 +
    Math.log10(clicks + 1) * 6;
  return Math.min(99, Math.max(1, Math.round(raw)));
}

export function formatCompactCount(value: number | null | undefined) {
  if (value == null) return "—";
  const n = Number(value);
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return new Intl.NumberFormat("en-IN").format(n);
}
