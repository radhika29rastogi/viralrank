import type { SupabaseClient } from "@supabase/supabase-js";
import { MIN_RANKING_BID, RANK_INCREMENT } from "@/lib/ranking";
import { startOfTodayIst } from "@/lib/arena/time";

export type ArenaRange = "all" | "today";

function bump(map: Map<string, number>, id: string | null | undefined, amount: number) {
  if (!id || !Number.isFinite(amount) || amount <= 0) return;
  map.set(id, Math.max(map.get(id) ?? 0, Math.round(amount)));
}

export async function getVerifiedRankBids(
  admin: SupabaseClient,
  options: { since?: string; categoryId?: string } = {},
) {
  const map = new Map<string, number>();
  const payments = admin
    .from("payments")
    .select("creator_id, amount_inr, created_at")
    .eq("type", "rank_bid")
    .eq("status", "verified")
    .not("creator_id", "is", null);
  const legacy = admin
    .from("creator_ranking_bids")
    .select("creator_id, amount, created_at")
    .eq("is_verified", true);

  const [payRes, legacyRes] = await Promise.all([
    options.since ? payments.gte("created_at", options.since) : payments,
    options.since ? legacy.gte("created_at", options.since) : legacy,
  ]);

  for (const row of payRes.data ?? []) {
    bump(map, row.creator_id as string, Number(row.amount_inr));
  }
  for (const row of legacyRes.data ?? []) {
    bump(map, row.creator_id as string, Number(row.amount));
  }
  return map;
}

export async function getCreatorVerifiedBid(admin: SupabaseClient, creatorId: string) {
  const [pay, legacy] = await Promise.all([
    admin
      .from("payments")
      .select("amount_inr")
      .eq("creator_id", creatorId)
      .eq("type", "rank_bid")
      .eq("status", "verified")
      .order("amount_inr", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("creator_ranking_bids")
      .select("amount")
      .eq("creator_id", creatorId)
      .eq("is_verified", true)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return Math.max(Number(pay.data?.amount_inr || 0), Math.round(Number(legacy.data?.amount || 0)));
}

export async function getCategoryTopBid(
  admin: SupabaseClient,
  options: { categoryId?: string | null; range?: ArenaRange } = {},
) {
  const since = options.range === "today" ? startOfTodayIst().toISOString() : undefined;
  const bids = await getVerifiedRankBids(admin, { since });
  if (!bids.size) return 0;

  if (!options.categoryId) {
    return Math.max(0, ...bids.values());
  }

  const ids = [...bids.keys()];
  const { data } = await admin.from("creators").select("id, category_id").in("id", ids);
  let top = 0;
  for (const row of data ?? []) {
    if (row.category_id !== options.categoryId) continue;
    top = Math.max(top, bids.get(row.id) ?? 0);
  }
  return top;
}

export function requiredRankBid(currentHighest: number) {
  if (!currentHighest || currentHighest <= 0) return MIN_RANKING_BID;
  return currentHighest + RANK_INCREMENT;
}

export function claimNumberOnePrice(categoryTopBid: number) {
  return requiredRankBid(categoryTopBid);
}
