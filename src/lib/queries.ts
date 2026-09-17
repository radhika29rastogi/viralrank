import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_CREATOR_STATUS, PUBLIC_LISTING_PAYMENT_STATUS } from "@/lib/creators/public";
import { categoryIcon, sortCategoriesForUi } from "@/lib/categories";
import { MIN_RANKING_BID, rankingScore } from "@/lib/ranking";
import { ensureCategoriesSeeded } from "@/lib/supabase/seed-categories";
import type { Battle, Category, Creator, Hype, RankingBid } from "@/types/database";

export type RankedCreator = Creator & { rankAmount: number };

/**
 * Public listing columns that exist on production without 0006.
 * Do not select `*` (PostgREST schema cache can include missing `instagram_clicks`).
 * Do not embed `categories` here — a failed embed zeros the entire creator query.
 */
const creatorSelect = `
  id,
  instagram_username,
  instagram_url,
  name,
  bio,
  profile_image_url,
  category_id,
  location,
  followers,
  average_views,
  instagram_data_source,
  current_highest_bid,
  current_rank_bid,
  ranking_score,
  ranking_score_at,
  combined_score,
  score_reached_at,
  verified_hype_total,
  current_rank,
  rank_set_at,
  stats_fetched_at,
  profile_clicks,
  hype_count,
  total_hype_amount,
  status,
  listing_payment_status,
  published_at,
  created_at,
  updated_at
`;

const creatorSelectOwner = `
  ${creatorSelect},
  user_id,
  contact_email,
  contact_phone
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ListingClient = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function publicCreatorFilters(query: any) {
  return query.eq("status", PUBLIC_CREATOR_STATUS).eq("listing_payment_status", PUBLIC_LISTING_PAYMENT_STATUS);
}

function logQueryError(context: string, error: { message?: string } | null | undefined) {
  if (error?.message) {
    console.error(`[${context}]`, error.message);
  }
}

async function getListingClient(): Promise<ListingClient | null> {
  return createAdminClient() ?? (await createClient());
}

async function attachCategories(client: ListingClient, rows: Creator[]): Promise<Creator[]> {
  const ids = [...new Set(rows.map((row) => row.category_id).filter(Boolean))] as string[];
  if (!ids.length) return rows;
  let { data, error } = await client.from("categories").select("id, name, slug, icon").in("id", ids);
  if (error) {
    const fallback = await client.from("categories").select("id, name, slug").in("id", ids);
    data = fallback.data;
    error = fallback.error;
  }
  logQueryError("attachCategories", error);
  const map = new Map(
    ((data as Category[]) ?? []).map((category) => [
      category.id,
      { ...category, icon: categoryIcon(category.slug, category.icon) },
    ]),
  );
  return rows.map((row) => ({
    ...row,
    categories: row.category_id ? (map.get(row.category_id) ?? null) : null,
  }));
}

function asCreators(rows: Creator[] | null | undefined): Creator[] {
  return (rows ?? []).map((row) => ({
    ...row,
    instagram_clicks: row.instagram_clicks ?? 0,
  }));
}

type LiveRankRow = {
  creator_id: string;
  combined_score: number | null;
  score_reached_at: string | null;
  live_rank: number | string;
};

function overlayLiveRanks(rows: Creator[], live: LiveRankRow[]): Creator[] {
  const byId = new Map(live.map((row) => [row.creator_id, row]));
  const byRank = new Map(live.map((row) => [Number(row.live_rank), row]));
  return rows.map((row) => {
    const hit = byId.get(row.id);
    const liveRank = hit ? Number(hit.live_rank) : null;
    const combined = Number(
      hit?.combined_score ??
        row.combined_score ??
        rankingScore(Number(row.current_highest_bid || 0), Number(row.total_hype_amount || 0)),
    );
    const targetRank = liveRank && liveRank > 1 ? liveRank - 1 : 1;
    const rival = byRank.get(targetRank);
    const rivalCombined = rival ? Number(rival.combined_score ?? combined) : combined;
    const reachedAt = hit?.score_reached_at ?? row.score_reached_at ?? row.ranking_score_at ?? null;
    return {
      ...row,
      current_rank: liveRank,
      combined_score: combined,
      ranking_score: combined,
      score_reached_at: reachedAt,
      ranking_score_at: reachedAt,
      target_rank: targetRank,
      rival_combined_score: rivalCombined,
    };
  });
}

async function attachLiveRanks(client: ListingClient, rows: Creator[]): Promise<Creator[]> {
  if (!rows.length) return rows;
  const { data, error } = await client
    .from("creator_live_ranks")
    .select("creator_id, combined_score, score_reached_at, live_rank");
  logQueryError("attachLiveRanks", error);
  if (error || !data) {
    return overlayLiveRanks(rows, []);
  }
  return overlayLiveRanks(rows, data as LiveRankRow[]);
}

function decorateCategory(row: Category): Category {
  const slug = row.slug?.trim().toLowerCase() ?? "";
  const name = row.name?.trim() ?? "";
  return {
    ...row,
    slug,
    name,
    icon: categoryIcon(slug, row.icon),
  };
}

function dedupeCategories(rows: Category[]): Category[] {
  const seen = new Set<string>();
  const items: Category[] = [];
  for (const row of rows) {
    const next = decorateCategory(row);
    if (!next.slug || !next.name || !row.id) continue;
    if (seen.has(next.slug)) continue;
    seen.add(next.slug);
    items.push(next);
  }
  return sortCategoriesForUi(items);
}

async function fetchCategoryRows(client: ListingClient) {
  const withIcon = await client.from("categories").select("id, name, slug, icon").order("name");
  if (!withIcon.error) return withIcon;
  return client.from("categories").select("id, name, slug").order("name");
}

export async function getCategories(): Promise<{ items: Category[]; error?: string }> {
  const admin = createAdminClient();
  if (admin) {
    const seed = await ensureCategoriesSeeded(admin);
    if (!seed.ok) {
      console.error("[getCategories] seed failed", seed.message);
      return { items: [], error: seed.message };
    }
    const { data, error } = await fetchCategoryRows(admin);
    if (error) {
      console.error("[getCategories] admin query failed", error.message);
      return { items: [], error: error.message };
    }
    return { items: dedupeCategories((data as Category[]) ?? []) };
  }

  const supabase = await createClient();
  if (!supabase) return { items: [], error: "Supabase is not configured." };
  const { data, error } = await fetchCategoryRows(supabase);
  if (error) {
    console.error("[getCategories] anon query failed", error.message);
    return { items: [], error: error.message };
  }
  return { items: dedupeCategories((data as Category[]) ?? []) };
}

/** Categories for submit — seeds missing catalog rows, returns all DB rows. */
export async function getSubmitCategories(): Promise<{ items: Category[]; error?: string }> {
  return getCategories();
}

export async function getCreatorByUsername(username: string) {
  const supabase = await getListingClient();
  if (!supabase) return null;
  const { data, error } = await publicCreatorFilters(
    supabase.from("creators").select(creatorSelect).eq("instagram_username", username.toLowerCase()),
  ).maybeSingle();
  logQueryError("getCreatorByUsername", error);
  const creator = (data as Creator | null) ?? null;
  if (!creator) return null;
  const [withCategory] = await attachCategories(supabase, asCreators([creator]));
  const [withRank] = await attachLiveRanks(supabase, withCategory ? [withCategory] : []);
  return withRank ?? null;
}

export async function getCreators(options: {
  category?: string;
  sort?: "bid" | "hype" | "clicks" | "followers" | "newest" | "trending";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await getListingClient();
  if (!supabase) return { items: [] as Creator[], total: 0 };

  let query = publicCreatorFilters(
    supabase.from("creators").select(creatorSelect, { count: "exact" }),
  );

  if (options.category && options.category !== "all") {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", options.category)
      .maybeSingle();
    if (!cat?.id) {
      return { items: [] as Creator[], total: 0 };
    }
    query = query.eq("category_id", cat.id);
  }

  if (options.search) {
    const q = `%${options.search}%`;
    query = query.or(`instagram_username.ilike.${q},name.ilike.${q},location.ilike.${q}`);
  }

  switch (options.sort) {
    case "hype":
      query = query.order("total_hype_amount", { ascending: false });
      break;
    case "trending":
      query = query
        .order("hype_count", { ascending: false })
        .order("combined_score", { ascending: false, nullsFirst: false })
        .order("score_reached_at", { ascending: true, nullsFirst: false });
      break;
    case "clicks":
      query = query.order("profile_clicks", { ascending: false });
      break;
    case "followers":
      query = query.order("followers", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order("combined_score", { ascending: false, nullsFirst: false })
        .order("score_reached_at", { ascending: true, nullsFirst: false });
  }

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  logQueryError("getCreators", error);
  const items = await attachLiveRanks(
    supabase,
    await attachCategories(supabase, asCreators(data as Creator[] | null)),
  );
  return { items, total: count ?? 0 };
}

function paidBattleScore(row: Pick<Creator, "combined_score" | "current_highest_bid" | "total_hype_amount">) {
  return Number(
    row.combined_score ??
      rankingScore(Number(row.current_highest_bid || 0), Number(row.total_hype_amount || 0)),
  );
}

function sortLiveRankRows(rows: LiveRankRow[]) {
  return [...rows].sort((a, b) => {
    const rankDelta = Number(a.live_rank) - Number(b.live_rank);
    if (rankDelta) return rankDelta;
    const scoreDelta = Number(b.combined_score ?? 0) - Number(a.combined_score ?? 0);
    if (scoreDelta) return scoreDelta;
    const aAt = a.score_reached_at ?? "";
    const bAt = b.score_reached_at ?? "";
    return aAt.localeCompare(bAt);
  });
}

async function getTopTwoByOrder(supabase: ListingClient): Promise<Creator[]> {
  const { data, error } = await publicCreatorFilters(
    supabase.from("creators").select(creatorSelect),
  )
    .gt("combined_score", 0)
    .order("combined_score", { ascending: false, nullsFirst: false })
    .order("score_reached_at", { ascending: true, nullsFirst: false })
    .limit(2);

  logQueryError("getTopTwo", error);
  const rows = await attachLiveRanks(
    supabase,
    await attachCategories(supabase, asCreators(data as Creator[] | null)),
  );
  return rows.filter((row) => paidBattleScore(row) > 0).slice(0, 2);
}

/** Live #1 and #2 by RANK() over combined_score. Never reads the battles history table. */
export async function getTopTwo(): Promise<Creator[]> {
  const supabase = await getListingClient();
  if (!supabase) return [];

  const { data: ranks, error } = await supabase
    .from("creator_live_ranks")
    .select("creator_id, live_rank, combined_score, score_reached_at")
    .lte("live_rank", 2);

  if (error) {
    logQueryError("getTopTwo", error);
    return getTopTwoByOrder(supabase);
  }

  const ids = [
    ...new Set(
      sortLiveRankRows((ranks ?? []) as LiveRankRow[])
        .filter((row) => Number(row.live_rank) <= 2 && Number(row.combined_score) > 0)
        .slice(0, 2)
        .map((row) => row.creator_id),
    ),
  ];
  if (!ids.length) return getTopTwoByOrder(supabase);
  const pair = (await getPublicCreatorsByIds(ids)).filter((row) => paidBattleScore(row) > 0);
  return pair.length ? pair : getTopTwoByOrder(supabase);
}

async function getPublicCreatorsByIds(ids: string[]): Promise<Creator[]> {
  const supabase = await getListingClient();
  if (!supabase || !ids.length) return [];
  const { data, error } = await publicCreatorFilters(
    supabase.from("creators").select(creatorSelect).in("id", ids),
  );
  logQueryError("getPublicCreatorsByIds", error);
  const rows = await attachLiveRanks(
    supabase,
    await attachCategories(supabase, asCreators(data as Creator[] | null)),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is Creator => Boolean(row));
}

type ActivityPaymentRow = {
  id: string;
  amount: number;
  created_at: string;
  creator_id: string;
};

export async function getArenaFeed(limit = 24): Promise<import("@/types/live").ArenaEvent[]> {
  const supabase = await getListingClient();
  if (!supabase) return [];

  const [{ data: bids }, { data: hypes }, { data: joins }] = await Promise.all([
    supabase
      .from("creator_ranking_bids")
      .select("id, amount, created_at, creator_id")
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("creator_hypes")
      .select("id, amount, created_at, creator_id")
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit),
    publicCreatorFilters(
      supabase.from("creators").select("id, instagram_username, created_at, published_at"),
    )
      .order("published_at", { ascending: false })
      .limit(limit),
  ]);

  const relatedIds = [
    ...((bids as ActivityPaymentRow[] | null) ?? []).map((row) => row.creator_id),
    ...((hypes as ActivityPaymentRow[] | null) ?? []).map((row) => row.creator_id),
  ];
  const listed = await getPublicCreatorsByIds([...new Set(relatedIds)]);
  const listedById = new Map(listed.map((creator) => [creator.id, creator]));

  const events: import("@/types/live").ArenaEvent[] = [
    ...((bids as ActivityPaymentRow[] | null) ?? [])
      .filter((row) => listedById.has(row.creator_id))
      .map((row) => {
        const creator = listedById.get(row.creator_id);
        return {
          id: `bid-${row.id}`,
          kind: "bid" as const,
          username: creator?.instagram_username ?? "creator",
          amount: Number(row.amount),
          rank: creator?.current_rank ?? null,
          created_at: row.created_at,
        };
      }),
    ...((hypes as ActivityPaymentRow[] | null) ?? [])
      .filter((row) => listedById.has(row.creator_id))
      .map((row) => {
        const creator = listedById.get(row.creator_id);
        return {
          id: `hype-${row.id}`,
          kind: "hype" as const,
          username: creator?.instagram_username ?? "creator",
          amount: Number(row.amount),
          created_at: row.created_at,
        };
      }),
    ...((joins ?? []).map((row: { id: string; instagram_username: string; published_at?: string | null; created_at: string }) => ({
      id: `join-${row.id}`,
      kind: "join" as const,
      username: row.instagram_username as string,
      created_at: (row.published_at as string) || (row.created_at as string),
    }))),
  ];

  return events.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, limit);
}

export async function getLiveStats() {
  const empty = {
    creatorsRanked: 0,
    creatorCount: 0,
    rankedCount: 0,
    movedThisWeek: 0,
    profileViews: 0,
    totalHype: 0,
    visitors: null as number | null,
    visitorsToday: 0,
  };
  const supabase = await getListingClient();
  if (!supabase) return empty;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const countQuery = publicCreatorFilters(
    supabase.from("creators").select("id", { count: "exact", head: true }),
  );
  const creatorsQuery = publicCreatorFilters(
    supabase.from("creators").select("id", { count: "exact", head: true }).gt("combined_score", 0),
  );

  const [
    { count, error: countError },
    { count: rankedCountRaw, error: creatorsError },
    { data: bids, error: bidsError },
    { data: hypes, error: hypesError },
  ] = await Promise.all([
    countQuery,
    creatorsQuery,
    supabase
      .from("creator_ranking_bids")
      .select("amount")
      .eq("is_verified", true)
      .gte("created_at", since),
    supabase
      .from("creator_hypes")
      .select("amount")
      .eq("is_verified", true)
      .gte("created_at", since),
  ]);
  logQueryError("getLiveStats.count", countError);
  logQueryError("getLiveStats.creators", creatorsError);
  logQueryError("getLiveStats.bids", bidsError);
  logQueryError("getLiveStats.hypes", hypesError);

  const movedThisWeek =
    (bids ?? []).reduce((sum: number, row: { amount?: number | null }) => sum + Number(row.amount || 0), 0) +
    (hypes ?? []).reduce((sum: number, row: { amount?: number | null }) => sum + Number(row.amount || 0), 0);
  const rankedCount = rankedCountRaw ?? 0;
  const creatorCount = count ?? 0;
  const profileViews = 0;
  const totalHype = 0;
  const admin = createAdminClient();
  const { countVisitorsToday } = await import("@/lib/arena/visits");
  const visitorsToday = admin ? await countVisitorsToday(admin) : 0;

  return {
    creatorsRanked: creatorCount,
    creatorCount,
    rankedCount,
    movedThisWeek,
    profileViews,
    totalHype,
    visitors: visitorsToday,
    visitorsToday,
  };
}

export async function getRankedCreators(options: {
  category?: string;
  range?: "all" | "today";
  limit?: number;
}) {
  const { getPeriodRankingScores, sortByRankingScore } = await import("@/lib/arena/ranking");
  const { startOfTodayIst } = await import("@/lib/arena/time");
  const supabase = await getListingClient();
  const admin = createAdminClient() ?? supabase;
  if (!supabase || !admin) return { items: [] as RankedCreator[], claimPrice: MIN_RANKING_BID, categoryId: null as string | null };

  let categoryId: string | null = null;
  if (options.category && options.category !== "all") {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", options.category)
      .maybeSingle();
    categoryId = cat?.id ?? null;
    if (options.category && !categoryId) {
      return { items: [] as RankedCreator[], claimPrice: MIN_RANKING_BID, categoryId: null };
    }
  }

  const { items } = await getCreators({
    category: options.category,
    sort: "bid",
    limit: options.limit ?? 40,
  });

  let ranked: RankedCreator[];
  if (options.range === "today") {
    const since = startOfTodayIst().toISOString();
    const scores = await getPeriodRankingScores(admin, { since });
    ranked = items
      .map((creator) => {
        const period = scores.get(creator.id);
        return {
          ...creator,
          rankAmount: period?.score ?? 0,
          ranking_score: period?.score ?? 0,
          ranking_score_at: period?.scoreAt ?? creator.ranking_score_at,
        };
      })
      .filter((creator) => creator.rankAmount > 0)
      .sort((a, b) =>
        sortByRankingScore(
          { score: a.rankAmount, scoreAt: a.ranking_score_at ?? null },
          { score: b.rankAmount, scoreAt: b.ranking_score_at ?? null },
        ),
      )
      .map((creator, index, list) => {
        const rival = list[index === 0 ? 0 : index - 1];
        return {
          ...creator,
          current_rank: index + 1,
          target_rank: index === 0 ? 1 : index,
          rival_combined_score: rival?.rankAmount ?? creator.rankAmount,
        };
      });
  } else {
    ranked = items
      .map((creator) => {
        const score = Number(creator.combined_score ?? creator.ranking_score ?? 0);
        return { ...creator, rankAmount: score };
      })
      .filter((creator) => creator.rankAmount > 0)
      .sort((a, b) =>
        sortByRankingScore(
          { score: a.rankAmount, scoreAt: a.score_reached_at ?? a.ranking_score_at ?? null },
          { score: b.rankAmount, scoreAt: b.score_reached_at ?? b.ranking_score_at ?? null },
        ),
      );
  }

  const claimPrice = MIN_RANKING_BID;
  return { items: ranked, claimPrice, categoryId };
}

export async function getPublicStats() {
  const admin = createAdminClient();
  const { countVisitorsToday, countVerifiedPayments } = await import("@/lib/arena/visits");
  const empty = { visitorsToday: 0, creatorCount: 0, paymentCount: 0 };
  if (!admin) return empty;
  const [{ count }, visitorsToday, paymentCount] = await Promise.all([
    publicCreatorFilters(admin.from("creators").select("id", { count: "exact", head: true })),
    countVisitorsToday(admin),
    countVerifiedPayments(admin),
  ]);
  return {
    visitorsToday,
    creatorCount: count ?? 0,
    paymentCount,
  };
}

export async function getCreatorByEditToken(token: string) {
  const admin = createAdminClient();
  if (!admin || !token) return null;
  const { data: byCreator } = await admin
    .from("creators")
    .select(creatorSelect)
    .eq("edit_token", token)
    .maybeSingle();
  if (byCreator) {
    const [withCategory] = await attachCategories(admin, asCreators([byCreator as Creator]));
    const [withRank] = await attachLiveRanks(admin, withCategory ? [withCategory] : []);
    return withRank ?? null;
  }
  const { data: payment } = await admin
    .from("payments")
    .select("creator_id")
    .eq("edit_token", token)
    .maybeSingle();
  if (!payment?.creator_id) return null;
  const { data } = await admin.from("creators").select(creatorSelect).eq("id", payment.creator_id).maybeSingle();
  if (!data) return null;
  const [withCategory] = await attachCategories(admin, asCreators([data as Creator]));
  const [withRank] = await attachLiveRanks(admin, withCategory ? [withCategory] : []);
  return withRank ?? null;
}

/** History log only. Live widgets must use getTopTwo(), not this row. */
export async function getLiveBattleHistory(): Promise<Battle | null> {
  const supabase = await getListingClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("battles")
    .select("id, creator_one_id, creator_two_id, creator_one_bid, creator_two_bid, winner_id, status, started_at, ended_at, created_at")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  logQueryError("getLiveBattleHistory", error);
  const battle = (data as Battle | null) ?? null;
  if (!battle) return null;
  const pair = await getPublicCreatorsByIds([battle.creator_one_id, battle.creator_two_id]);
  const byId = new Map(pair.map((row) => [row.id, row]));
  return {
    ...battle,
    creator_one: byId.get(battle.creator_one_id) ?? null,
    creator_two: byId.get(battle.creator_two_id) ?? null,
  };
}

export async function getHomeBattleContext() {
  const { getDailyBattleResult, yesterdayBattleDate, todayBattleDate } = await import("@/lib/arena/battle");
  const { isPastEightPmIst } = await import("@/lib/arena/time");
  const admin = createAdminClient();
  const leaders = await getTopTwo();
  if (!admin) {
    return { leaders, yesterday: null, todayFinal: null as Awaited<ReturnType<typeof getDailyBattleResult>> };
  }
  const yDate = yesterdayBattleDate();
  const [yesterdayRaw, todayRaw] = await Promise.all([
    getDailyBattleResult(admin, yDate),
    isPastEightPmIst() ? getDailyBattleResult(admin, todayBattleDate()) : Promise.resolve(null),
  ]);
  const ids = [
    yesterdayRaw?.winner_id,
    yesterdayRaw?.creator_one_id,
    yesterdayRaw?.creator_two_id,
    todayRaw?.winner_id,
    todayRaw?.creator_one_id,
    todayRaw?.creator_two_id,
  ].filter((id): id is string => Boolean(id));
  const people = await getPublicCreatorsByIds([...new Set(ids)]);
  const byId = new Map(people.map((row) => [row.id, row]));
  const attach = (row: typeof yesterdayRaw) =>
    row
      ? {
          ...row,
          winner: row.winner_id ? byId.get(row.winner_id) ?? null : null,
          creator_one: row.creator_one_id ? byId.get(row.creator_one_id) ?? null : null,
          creator_two: row.creator_two_id ? byId.get(row.creator_two_id) ?? null : null,
        }
      : null;
  return { leaders, yesterday: attach(yesterdayRaw), todayFinal: attach(todayRaw) };
}

export async function getRecentActivity(limit = 16) {
  return getArenaFeed(limit);
}

export async function getMostHyped(limit = 8) {
  return getCreators({ sort: "hype", limit });
}

export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return { user: null, isAdmin: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name")
    .eq("id", user.id)
    .maybeSingle();
  return { user, isAdmin: Boolean(profile?.is_admin), profile };
}

export async function getDashboardData(userId: string) {
  const supabase = await createClient();
  if (!supabase) {
    return { creators: [] as Creator[], bids: [] as RankingBid[], hypes: [] as Hype[], history: [] };
  }

  const [{ data: creators }, { data: bids }, { data: hypes }] = await Promise.all([
    supabase.from("creators").select(creatorSelectOwner).eq("user_id", userId),
    supabase
      .from("creator_ranking_bids")
      .select("*")
      .eq("supporter_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("creator_hypes")
      .select("*")
      .eq("supporter_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const creatorIds = (creators ?? []).map((c) => c.id);
  let history: Array<{ creator_id: string; rank: number | null; highest_bid: number; created_at: string }> = [];
  if (creatorIds.length) {
    const { data } = await supabase
      .from("rank_history")
      .select("*")
      .in("creator_id", creatorIds)
      .order("created_at", { ascending: false })
      .limit(30);
    history = data ?? [];
  }

  return {
    creators: await attachLiveRanks(supabase, await attachCategories(supabase, asCreators(creators as Creator[] | null))),
    bids: (bids as RankingBid[]) ?? [],
    hypes: (hypes as Hype[]) ?? [],
    history,
  };
}
