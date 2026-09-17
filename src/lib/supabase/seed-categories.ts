import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_CATALOG, FEATURED_CATEGORY_SLUGS, categoryIcon } from "@/lib/categories";
import { formatSupabaseError } from "@/lib/supabase/diagnostics";

/** Canonical category rows — keep in sync with supabase/migrations/0013_category_niches.sql */
export const CATEGORY_SEED = CATEGORY_CATALOG.map((row) => ({
  name: row.name,
  slug: row.slug,
  icon: row.icon,
}));

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_ALIASES: Record<string, string[]> = {
  tech: ["tech", "technology"],
};

export type EnsureCategoriesResult =
  | { ok: true; inserted: number; total: number }
  | { ok: false; reason: "missing_table" | "seed_failed"; message: string };

type CategorySeedRow = { name: string; slug: string; icon?: string };

async function insertCategoryRows(admin: SupabaseClient, rows: CategorySeedRow[]) {
  const withIcon = await admin.from("categories").insert(
    rows.map((row) => ({ name: row.name, slug: row.slug, icon: row.icon ?? categoryIcon(row.slug) })),
  );
  if (!withIcon.error) return withIcon;
  const missingIconColumn =
    withIcon.error.message.toLowerCase().includes("icon") || withIcon.error.code === "PGRST204";
  if (!missingIconColumn) return withIcon;
  return admin.from("categories").insert(rows.map((row) => ({ name: row.name, slug: row.slug })));
}

/** Idempotent upsert of default categories (service role required). */
export async function ensureCategoriesSeeded(
  admin: SupabaseClient,
): Promise<EnsureCategoriesResult> {
  const { data: existing, error: listError } = await admin.from("categories").select("slug");

  if (listError) {
    const missingTable =
      listError.code === "42P01" || listError.message.toLowerCase().includes("does not exist");
    return {
      ok: false,
      reason: missingTable ? "missing_table" : "seed_failed",
      message: missingTable
        ? "The categories table is missing. Run supabase/migrations/0001_init.sql in the Supabase SQL editor."
        : formatSupabaseError(listError),
    };
  }

  const have = new Set((existing ?? []).map((row) => String((row as { slug?: string }).slug ?? "").toLowerCase()));
  const missing = CATEGORY_SEED.filter((row) => !have.has(row.slug));

  if (missing.length > 0) {
    const inserted = await insertCategoryRows(admin, [...missing]);
    if (inserted.error && inserted.error.code !== "23505") {
      return { ok: false, reason: "seed_failed", message: formatSupabaseError(inserted.error) };
    }
  }

  const { count: total } = await admin.from("categories").select("id", { count: "exact", head: true });

  return { ok: true, inserted: missing.length, total: total ?? have.size + missing.length };
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
      "Category not found in the database. Run supabase/migrations/0013_category_niches.sql in the Supabase SQL editor.",
  };
}

export function isFeaturedCategorySlug(slug: string) {
  return (FEATURED_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
