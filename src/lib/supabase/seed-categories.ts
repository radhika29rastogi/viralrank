import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURED_CATEGORY_SLUGS } from "@/lib/categories";
import { formatSupabaseError } from "@/lib/supabase/diagnostics";

/** Canonical category rows — keep in sync with supabase/migrations/0001_init.sql */
export const CATEGORY_SEED = [
  { name: "Fashion", slug: "fashion" },
  { name: "Beauty", slug: "beauty" },
  { name: "Fitness", slug: "fitness" },
  { name: "Lifestyle", slug: "lifestyle" },
  { name: "Food", slug: "food" },
  { name: "Travel", slug: "travel" },
  { name: "Technology", slug: "technology" },
  { name: "Tech", slug: "tech" },
  { name: "Gaming", slug: "gaming" },
  { name: "Education", slug: "education" },
  { name: "Finance", slug: "finance" },
  { name: "Comedy", slug: "comedy" },
  { name: "Memes", slug: "memes" },
  { name: "Videos", slug: "videos" },
  { name: "Music", slug: "music" },
  { name: "Art", slug: "art" },
  { name: "Photography", slug: "photography" },
  { name: "Business", slug: "business" },
  { name: "Digital Marketing", slug: "digital-marketing" },
  { name: "Sports", slug: "sports" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Health", slug: "health" },
  { name: "Other", slug: "other" },
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_ALIASES: Record<string, string[]> = {
  tech: ["tech", "technology"],
};

export type EnsureCategoriesResult =
  | { ok: true; inserted: number; total: number }
  | { ok: false; reason: "missing_table" | "seed_failed"; message: string };

/** Idempotent upsert of default categories (service role required). */
export async function ensureCategoriesSeeded(
  admin: SupabaseClient,
): Promise<EnsureCategoriesResult> {
  const { count: before, error: countError } = await admin
    .from("categories")
    .select("id", { count: "exact", head: true });

  if (countError) {
    const missingTable =
      countError.code === "42P01" ||
      countError.message.toLowerCase().includes("does not exist");
    return {
      ok: false,
      reason: missingTable ? "missing_table" : "seed_failed",
      message: missingTable
        ? "The categories table is missing. Run supabase/migrations/0001_init.sql in the Supabase SQL editor."
        : formatSupabaseError(countError),
    };
  }

  if ((before ?? 0) > 0) {
    return { ok: true, inserted: 0, total: before ?? 0 };
  }

  const { error: insertError } = await admin.from("categories").insert(
    CATEGORY_SEED.map((row) => ({ name: row.name, slug: row.slug })),
  );

  if (insertError) {
    if (insertError.code === "23505") {
      const { count: total } = await admin
        .from("categories")
        .select("id", { count: "exact", head: true });
      return { ok: true, inserted: 0, total: total ?? 0 };
    }
    return { ok: false, reason: "seed_failed", message: formatSupabaseError(insertError) };
  }

  const { count: total } = await admin
    .from("categories")
    .select("id", { count: "exact", head: true });

  return { ok: true, inserted: Math.max(0, (total ?? 0) - (before ?? 0)), total: total ?? 0 };
}

/** Resolve a category UUID from a UUID or slug submitted by the form. */
export async function resolveCategoryId(
  admin: SupabaseClient,
  categoryIdOrSlug: string,
): Promise<{ id: string } | { error: string }> {
  const raw = categoryIdOrSlug.trim();
  if (!raw) {
    return { error: "Please select a category." };
  }

  if (UUID_PATTERN.test(raw)) {
    const { data } = await admin.from("categories").select("id").eq("id", raw).maybeSingle();
    if (data?.id) return { id: data.id };
    return { error: "Please select a valid category." };
  }

  const slugs = SLUG_ALIASES[raw] ?? [raw];
  for (const slug of slugs) {
    const { data } = await admin.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (data?.id) return { id: data.id };
  }

  return {
    error:
      "Category not found in the database. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.",
  };
}

export function isFeaturedCategorySlug(slug: string) {
  return (FEATURED_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
