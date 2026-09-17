import type { SupabaseClient } from "@supabase/supabase-js";
import { istCalendarDate, istEightPm, latestBattleCutoff } from "@/lib/arena/time";
import type { Creator } from "@/types/database";

export type DailyBattleResult = {
  id: string;
  battle_date: string;
  creator_one_id: string | null;
  creator_two_id: string | null;
  creator_one_hype_today: number;
  creator_two_hype_today: number;
  creator_one_engagement_score: number;
  creator_two_engagement_score: number;
  winner_id: string | null;
  decided_by: "hype" | "engagement";
  created_at: string;
  winner?: Creator | null;
  creator_one?: Creator | null;
  creator_two?: Creator | null;
};

function statedAmount(row: { bid_amount?: number | null; amount_inr?: number | null }) {
  const bid = Number(row.bid_amount);
  if (Number.isFinite(bid) && bid > 0) return Math.round(bid);
  return Math.round(Number(row.amount_inr || 0));
}

/**
 * Daily battle engagement for the 20:00 IST window:
 *   score = profile_visits + 2 * engagement_actions
 * profile_visits = visits whose path is /creator/{username}
 * engagement_actions = visits whose path is /api/creators/{id}/instagram (Instagram click-through)
 */
export function battleEngagementScore(profileVisits: number, engagementActions: number) {
  return Math.round(profileVisits) + 2 * Math.round(engagementActions);
}

export async function getBattlePair(admin: SupabaseClient) {
  const { data: ranks, error: rankError } = await admin
    .from("creator_live_ranks")
    .select("creator_id, live_rank, combined_score, score_reached_at")
    .lte("live_rank", 2);

  const ids = [
    ...new Set(
      [...((ranks ?? []) as { creator_id: string; live_rank: number | string; combined_score?: number }[])]
        .filter((row) => Number(row.live_rank) <= 2 && Number(row.combined_score) > 0)
        .sort((a, b) => Number(a.live_rank) - Number(b.live_rank))
        .slice(0, 2)
        .map((row) => row.creator_id),
    ),
  ];
  if (!rankError && ids.length) {
    const { data, error } = await admin
      .from("creators")
      .select(
        "id, instagram_username, name, profile_image_url, current_rank, combined_score, ranking_score, current_highest_bid, total_hype_amount, verified_hype_total, score_reached_at, status, listing_payment_status",
      )
      .in("id", ids)
      .eq("status", "active")
      .eq("listing_payment_status", "paid")
      .gt("combined_score", 0);
    if (error) {
      console.error("[battle] pair failed", error.message);
      return [] as Creator[];
    }
    const byId = new Map(((data as Creator[]) ?? []).map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)).filter((row): row is Creator => Boolean(row));
  }

  if (rankError) {
    console.error("[battle] live ranks failed", rankError.message);
  }

  const { data, error } = await admin
    .from("creators")
    .select(
      "id, instagram_username, name, profile_image_url, current_rank, combined_score, ranking_score, current_highest_bid, total_hype_amount, verified_hype_total, score_reached_at, status, listing_payment_status",
    )
    .eq("status", "active")
    .eq("listing_payment_status", "paid")
    .gt("combined_score", 0)
    .order("combined_score", { ascending: false, nullsFirst: false })
    .order("score_reached_at", { ascending: true, nullsFirst: false })
    .limit(2);
  if (error) {
    console.error("[battle] pair failed", error.message);
    return [] as Creator[];
  }
  return (data as Creator[]) ?? [];
}

async function hypeInWindow(admin: SupabaseClient, creatorId: string, startIso: string, endIso: string) {
  const { data, error } = await admin
    .from("payments")
    .select("bid_amount, amount_inr")
    .eq("creator_id", creatorId)
    .eq("type", "hype")
    .eq("status", "verified")
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (error) {
    console.error("[battle] hype window failed", error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + statedAmount(row), 0);
}

async function engagementInWindow(
  admin: SupabaseClient,
  creator: Pick<Creator, "id" | "instagram_username">,
  startIso: string,
  endIso: string,
) {
  const profilePath = `/creator/${creator.instagram_username}`;
  const igPath = `/api/creators/${creator.id}/instagram`;
  const [{ count: profileVisits }, { count: igClicks }] = await Promise.all([
    admin
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("path", profilePath)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("path", igPath)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);
  return battleEngagementScore(profileVisits ?? 0, igClicks ?? 0);
}

function pickWinner(input: {
  oneId: string;
  twoId: string;
  oneHype: number;
  twoHype: number;
  oneEng: number;
  twoEng: number;
}): { winnerId: string; decidedBy: "hype" | "engagement" } {
  const anyHype = input.oneHype > 0 || input.twoHype > 0;
  if (anyHype && input.oneHype !== input.twoHype) {
    return {
      winnerId: input.oneHype > input.twoHype ? input.oneId : input.twoId,
      decidedBy: "hype",
    };
  }
  if (input.oneEng !== input.twoEng) {
    return {
      winnerId: input.oneEng > input.twoEng ? input.oneId : input.twoId,
      decidedBy: "engagement",
    };
  }
  return { winnerId: input.oneId, decidedBy: anyHype ? "engagement" : "engagement" };
}

export async function settleDailyBattle(
  admin: SupabaseClient,
  now = new Date(),
): Promise<{ ok: true; result: DailyBattleResult | null; skipped?: string } | { ok: false; error: string }> {
  const cutoff = latestBattleCutoff(now);
  if (now.getTime() < cutoff.getTime()) {
    return { ok: true, result: null, skipped: "cutoff_not_reached" };
  }

  const battleDate = istCalendarDate(cutoff);
  const { data: existing } = await admin
    .from("daily_battle_results")
    .select("*")
    .eq("battle_date", battleDate)
    .maybeSingle();
  if (existing) {
    return { ok: true, result: existing as DailyBattleResult, skipped: "already_settled" };
  }

  const pair = await getBattlePair(admin);
  if (pair.length < 2) {
    return { ok: true, result: null, skipped: "need_two_ranked_creators" };
  }

  const start = istEightPm(new Date(cutoff.getTime() - 24 * 60 * 60 * 1000));
  const startIso = start.toISOString();
  const endIso = cutoff.toISOString();
  const [one, two] = pair;

  const [oneHype, twoHype, oneEng, twoEng] = await Promise.all([
    hypeInWindow(admin, one.id, startIso, endIso),
    hypeInWindow(admin, two.id, startIso, endIso),
    engagementInWindow(admin, one, startIso, endIso),
    engagementInWindow(admin, two, startIso, endIso),
  ]);

  const { winnerId, decidedBy } = pickWinner({
    oneId: one.id,
    twoId: two.id,
    oneHype,
    twoHype,
    oneEng,
    twoEng,
  });

  const row = {
    battle_date: battleDate,
    creator_one_id: one.id,
    creator_two_id: two.id,
    creator_one_hype_today: oneHype,
    creator_two_hype_today: twoHype,
    creator_one_engagement_score: oneEng,
    creator_two_engagement_score: twoEng,
    winner_id: winnerId,
    decided_by: decidedBy,
  };

  const { data, error } = await admin.from("daily_battle_results").insert(row).select("*").single();
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      const { data: raced } = await admin
        .from("daily_battle_results")
        .select("*")
        .eq("battle_date", battleDate)
        .maybeSingle();
      return { ok: true, result: (raced as DailyBattleResult) ?? null, skipped: "already_settled" };
    }
    console.error("[battle] insert failed", error.message);
    return { ok: false, error: "Could not store the daily battle result." };
  }

  return { ok: true, result: data as DailyBattleResult };
}

export async function getDailyBattleResult(admin: SupabaseClient, battleDate: string) {
  const { data, error } = await admin
    .from("daily_battle_results")
    .select("*")
    .eq("battle_date", battleDate)
    .maybeSingle();
  if (error) {
    console.error("[battle] load failed", error.message);
    return null;
  }
  return (data as DailyBattleResult | null) ?? null;
}

export function yesterdayBattleDate(now = new Date()) {
  const todayEight = istEightPm(now);
  if (now.getTime() >= todayEight.getTime()) {
    return istCalendarDate(new Date(todayEight.getTime() - 24 * 60 * 60 * 1000));
  }
  return istCalendarDate(latestBattleCutoff(now));
}

export function todayBattleDate(now = new Date()) {
  return istCalendarDate(istEightPm(now));
}
