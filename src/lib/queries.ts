import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_CREATOR_STATUS, PUBLIC_LISTING_PAYMENT_STATUS } from "@/lib/creators/public";
import { ensureCategoriesSeeded } from "@/lib/supabase/seed-categories";
import type { Battle, Category, Creator, Hype, RankingBid } from "@/types/database";

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
  current_rank,
  rank_set_at,
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
  const { data, error } = await client.from("categories").select("id, name, slug").in("id", ids);
  logQueryError("attachCategories", error);
  const map = new Map(((data as Category[]) ?? []).map((category) => [category.id, category]));
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

function dedupeCategories(rows: Category[]): Category[] {
  const seen = new Set<string>();
  const items: Category[] = [];
  for (const row of rows) {
    const slug = row.slug?.trim().toLowerCase();
    const name = row.name?.trim();
    if (!slug || !name || !row.id) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({ ...row, slug, name });
  }
  return items;
}

export async function getCategories(): Promise<{ items: Category[]; error?: string }> {
  const admin = createAdminClient();
  if (admin) {
    const seed = await ensureCategoriesSeeded(admin);
    if (!seed.ok) {
      console.error("[getCategories] seed failed", seed.message);
      return { items: [], error: seed.message };
    }
    const { data, error } = await admin.from("categories").select("id, name, slug").order("name");
    if (error) {
      console.error("[getCategories] admin query failed", error.message);
      return { items: [], error: error.message };
    }
    return { items: dedupeCategories((data as Category[]) ?? []) };
  }

  const supabase = await createClient();
  if (!supabase) return { items: [], error: "Supabase is not configured." };
  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
  if (error) {
    console.error("[getCategories] anon query failed", error.message);
    return { items: [], error: error.message };
  }
  return { items: dedupeCategories((data as Category[]) ?? []) };
}

/** Categories for submit — seeds when empty, returns all DB rows sorted by name. */
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
  return withCategory ?? null;
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
        .order("current_rank", { ascending: true, nullsFirst: false })
        .order("published_at", { ascending: false, nullsFirst: false });
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
        .order("current_highest_bid", { ascending: false })
        .order("rank_set_at", { ascending: true, nullsFirst: false });
  }

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  logQueryError("getCreators", error);
  const items = await attachCategories(supabase, asCreators(data as Creator[] | null));
  return { items, total: count ?? 0 };
}

export async function getTopTwo(): Promise<Creator[]> {
  const supabase = await getListingClient();
  if (!supabase) return [];

  const { data, error } = await publicCreatorFilters(
    supabase.from("creators").select(creatorSelect),
  )
    .not("current_rank", "is", null)
    .order("current_rank", { ascending: true })
    .limit(2);

  logQueryError("getTopTwo", error);
  return attachCategories(supabase, asCreators(data as Creator[] | null));
}

async function getPublicCreatorsByIds(ids: string[]): Promise<Creator[]> {
  const supabase = await getListingClient();
  if (!supabase || !ids.length) return [];
  const { data, error } = await publicCreatorFilters(
    supabase.from("creators").select(creatorSelect).in("id", ids),
  );
  logQueryError("getPublicCreatorsByIds", error);
  const rows = await attachCategories(supabase, asCreators(data as Creator[] | null));
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
  };
  const supabase = await getListingClient();
  if (!supabase) return empty;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const countQuery = publicCreatorFilters(
    supabase.from("creators").select("id", { count: "exact", head: true }),
  );
  const creatorsQuery = publicCreatorFilters(
    supabase.from("creators").select("profile_clicks, hype_count, current_rank"),
  );

  const [
    { count, error: countError },
    { data: creators, error: creatorsError },
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
    (bids ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0) +
    (hypes ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const rows = (creators ?? []) as Array<{
    profile_clicks?: number | null;
    hype_count?: number | null;
    current_rank?: number | null;
  }>;
  const profileViews = rows.reduce((sum, row) => sum + Number(row.profile_clicks || 0), 0);
  const totalHype = rows.reduce((sum, row) => sum + Number(row.hype_count || 0), 0);
  const rankedCount = rows.filter((row) => row.current_rank != null && row.current_rank > 0).length;
  const creatorCount = count ?? 0;

  return {
    creatorsRanked: creatorCount,
    creatorCount,
    rankedCount,
    movedThisWeek,
    profileViews,
    totalHype,
    visitors: null,
  };
}

export async function getLiveBattle(): Promise<Battle | null> {
  const supabase = await getListingClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("battles")
    .select("id, creator_one_id, creator_two_id, creator_one_bid, creator_two_bid, winner_id, status, started_at, ended_at, created_at")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  logQueryError("getLiveBattle", error);
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
    creators: await attachCategories(supabase, asCreators(creators as Creator[] | null)),
    bids: (bids as RankingBid[]) ?? [],
    hypes: (hypes as Hype[]) ?? [],
    history,
  };
}
