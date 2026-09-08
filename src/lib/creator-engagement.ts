import type { Creator } from "@/types/database";

export function totalEngagement(creator: Pick<Creator, "hype_count" | "profile_clicks" | "instagram_clicks">) {
  return (
    Number(creator.hype_count || 0) +
    Number(creator.profile_clicks || 0) +
    Number(creator.instagram_clicks || 0)
  );
}

export function displayRank(rank: number | null | undefined) {
  return rank != null && rank > 0 ? `#${rank}` : null;
}
