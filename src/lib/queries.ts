import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CREATOR_CATEGORY_OPTIONS } from "@/lib/categories";
import { ensureCategoriesSeeded, isFeaturedCategorySlug } from "@/lib/supabase/seed-categories";
import type { Battle, Category, Creator, Hype, RankingBid } from "@/types/database";

const creatorSelect = `
  *,
  categories:category_id ( id, name, slug )
`;

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data as Category[]) ?? [];
}

/** Categories for the submit form — seeds defaults when empty, returns featured slugs with DB ids. */
export async function getSubmitCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  if (admin) {
    await ensureCategoriesSeeded(admin);
  }
  const all = await getCategories();
  const bySlug = new Map(all.filter((c) => isFeaturedCategorySlug(c.slug)).map((c) => [c.slug, c]));
  return CREATOR_CATEGORY_OPTIONS.flatMap((opt) => {
    const row = bySlug.get(opt.slug);
    return row ? [row] : [];
  });
}

export async function getCreatorByUsername(username: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("creators")
    .select(creatorSelect)
    .eq("instagram_username", username.toLowerCase())
    .maybeSingle();
  return (data as Creator | null) ?? null;
}

export async function getCreators(options: {
  category?: string;
  sort?: "bid" | "hype" | "clicks" | "followers" | "newest";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { items: [] as Creator[], total: 0 };

  let query = supabase
    .from("creators")
    .select(creatorSelect, { count: "exact" })
    .eq("status", "approved");

  if (options.category && options.category !== "all") {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", options.category)
      .maybeSingle();
    if (cat?.id) query = query.eq("category_id", cat.id);
  }

  if (options.search) {
    const q = `%${options.search}%`;
    query = query.or(
      `instagram_username.ilike.${q},name.ilike.${q},location.ilike.${q}`,
    );
  }

  switch (options.sort) {
    case "hype":
      query = query.order("total_hype_amount", { ascending: false });
      break;
    case "clicks":
      query = query.order("profile_clicks", { ascending: false });
      break;
    case "followers":
      query = query.order("followers", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("current_highest_bid", { ascending: false })
        .order("rank_set_at", { ascending: true, nullsFirst: false });
  }

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;
  const { data, count } = await query.range(offset, offset + limit - 1);
  return { items: (data as Creator[]) ?? [], total: count ?? 0 };
}

export async function getTopTwo(): Promise<Creator[]> {
  const { items } = await getCreators({ sort: "bid", limit: 2 });
  return items;
}

type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  creators:
    | { instagram_username: string; current_rank: number | null }
    | { instagram_username: string; current_rank: number | null }[]
    | null;
};

type HypeRow = {
  id: string;
  amount: number;
  created_at: string;
  creators: { instagram_username: string } | { instagram_username: string }[] | null;
};

export async function getLiveStats() {
  const empty = { creatorsRanked: 0, movedThisWeek: 0, profileViews: 0 };
  const supabase = await createClient();
  if (!supabase) return empty;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count }, { data: creators }, { data: bids }, { data: hypes }] = await Promise.all([
    supabase.from("creators").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("creators").select("profile_clicks").eq("status", "approved"),
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

  const movedThisWeek =
    (bids ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0) +
    (hypes ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const profileViews = (creators ?? []).reduce(
    (sum, row) => sum + Number(row.profile_clicks || 0),
    0,
  );

  return {
    creatorsRanked: count ?? 0,
    movedThisWeek,
    profileViews,
  };
}

export async function getArenaFeed(limit = 24): Promise<import("@/types/live").ArenaEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const [{ data: bids }, { data: hypes }, { data: joins }] = await Promise.all([
    supabase
      .from("creator_ranking_bids")
      .select("id, amount, created_at, creators(instagram_username, current_rank)")
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("creator_hypes")
      .select("id, amount, created_at, creators(instagram_username)")
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("creators")
      .select("id, instagram_username, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const events: import("@/types/live").ArenaEvent[] = [
    ...((bids as BidRow[] | null) ?? []).map((row) => {
      const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
      return {
        id: `bid-${row.id}`,
        kind: "bid" as const,
        username: creator?.instagram_username ?? "creator",
        amount: Number(row.amount),
        rank: creator?.current_rank ?? null,
        created_at: row.created_at,
      };
    }),
    ...((hypes as HypeRow[] | null) ?? []).map((row) => {
      const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
      return {
        id: `hype-${row.id}`,
        kind: "hype" as const,
        username: creator?.instagram_username ?? "creator",
        amount: Number(row.amount),
        created_at: row.created_at,
      };
    }),
    ...((joins ?? []).map((row) => ({
      id: `join-${row.id}`,
      kind: "join" as const,
      username: row.instagram_username as string,
      created_at: row.created_at as string,
    }))),
  ];

  return events.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, limit);
}

export async function getLiveBattle(): Promise<Battle | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("battles")
    .select(
      `
      *,
      creator_one:creator_one_id (${creatorSelect}),
      creator_two:creator_two_id (${creatorSelect})
    `,
    )
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Battle | null) ?? null;
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
    supabase.from("creators").select(creatorSelect).eq("user_id", userId),
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
    creators: (creators as Creator[]) ?? [],
    bids: (bids as RankingBid[]) ?? [],
    hypes: (hypes as Hype[]) ?? [],
    history,
  };
}
