import type { SupabaseClient } from "@supabase/supabase-js";
import { rankingScore } from "@/lib/ranking";
import type { Creator } from "@/types/database";

/**
 * Server-side ranking source of truth.
 *
 * combined_score = current_highest_bid + total_hype_amount (generated column).
 * Live rank is RANK() OVER (ORDER BY combined_score DESC, score_reached_at ASC)
 * from creator_live_ranks — computed at query time, not a stored current_rank.
 *
 * current_highest_bid = MAX(bid_amount) of verified rank_bid payments.
 * total_hype_amount = SUM(bid_amount) of verified hype payments.
 * amount_charged (coupon discount) is NEVER used for rank.
 * Ties: earlier score_reached_at (when the current total was first reached) ranks higher.
 */

export function displayRankingScore(
  creator: Pick<
    Creator,
    | "combined_score"
    | "ranking_score"
    | "current_highest_bid"
    | "verified_hype_total"
    | "total_hype_amount"
  >,
) {
  if (typeof creator.combined_score === "number" && creator.combined_score >= 0) {
    return Math.round(creator.combined_score);
  }
  if (typeof creator.ranking_score === "number" && creator.ranking_score >= 0) {
    return Math.round(creator.ranking_score);
  }
  return rankingScore(
    Number(creator.current_highest_bid || 0),
    Number(creator.verified_hype_total ?? creator.total_hype_amount ?? 0),
  );
}

export type PeriodScore = {
  score: number;
  highestBid: number;
  hypeTotal: number;
  scoreAt: string | null;
};

function statedAmount(row: { bid_amount?: number | null; amount_inr?: number | null }) {
  const bid = Number(row.bid_amount);
  if (Number.isFinite(bid) && bid > 0) return Math.round(bid);
  return Math.round(Number(row.amount_inr || 0));
}

/** Period ranking_score from verified payments in a window (e.g. Today since midnight IST). */
export async function getPeriodRankingScores(
  admin: SupabaseClient,
  options: { since: string },
) {
  const map = new Map<string, PeriodScore>();
  const { data, error } = await admin
    .from("payments")
    .select("creator_id, type, bid_amount, amount_inr, verified_at, created_at")
    .in("type", ["rank_bid", "hype"])
    .eq("status", "verified")
    .not("creator_id", "is", null)
    .gte("created_at", options.since);

  if (error) {
    console.error("[ranking] period scores failed", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const id = row.creator_id as string;
    const amount = statedAmount(row);
    if (!id || amount <= 0) continue;
    const at = (row.verified_at as string | null) || (row.created_at as string | null);
    const prev = map.get(id) ?? { score: 0, highestBid: 0, hypeTotal: 0, scoreAt: null };
    if (row.type === "rank_bid") {
      if (amount > prev.highestBid) {
        prev.highestBid = amount;
        prev.scoreAt = at;
      } else if (amount === prev.highestBid && at && (!prev.scoreAt || at < prev.scoreAt)) {
        prev.scoreAt = at;
      }
    } else {
      prev.hypeTotal += amount;
      if (at && (!prev.scoreAt || at > prev.scoreAt)) prev.scoreAt = at;
    }
    prev.score = rankingScore(prev.highestBid, prev.hypeTotal);
    map.set(id, prev);
  }
  return map;
}

export function sortByRankingScore<T extends { score: number; scoreAt: string | null }>(a: T, b: T) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.scoreAt && b.scoreAt) return a.scoreAt.localeCompare(b.scoreAt);
  if (a.scoreAt) return -1;
  if (b.scoreAt) return 1;
  return 0;
}
