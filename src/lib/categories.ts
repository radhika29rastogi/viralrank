export type CategoryMeta = {
  name: string;
  slug: string;
  icon: string;
};

/**
 * Canonical category catalog. Seed, home pills, flavor tiles, and form
 * dropdowns all derive from this list so they cannot drift.
 */
export const CATEGORY_CATALOG: readonly CategoryMeta[] = [
  { name: "Memes", slug: "memes", icon: "😂" },
  { name: "Videos", slug: "videos", icon: "🎬" },
  { name: "Music", slug: "music", icon: "🎵" },
  { name: "Art", slug: "art", icon: "🎨" },
  { name: "Gaming", slug: "gaming", icon: "🎮" },
  { name: "Tech", slug: "tech", icon: "💻" },
  { name: "Fashion", slug: "fashion", icon: "👗" },
  { name: "Lifestyle", slug: "lifestyle", icon: "📸" },
  { name: "Comedy", slug: "comedy", icon: "🎭" },
  { name: "Devotional", slug: "devotional", icon: "🙏" },
  { name: "Motivation", slug: "motivation", icon: "🔥" },
  { name: "Dance", slug: "dance", icon: "💃" },
  { name: "Health & Wellness", slug: "health-wellness", icon: "🧘" },
  { name: "Vlogs", slug: "vlogs", icon: "📸" },
  { name: "Astrology", slug: "astrology", icon: "🔮" },
  { name: "News", slug: "news", icon: "📰" },
  { name: "Sports", slug: "sports", icon: "⚽" },
  { name: "Pets & Animals", slug: "pets-animals", icon: "🐾" },
  { name: "Automobile", slug: "automobile", icon: "🚗" },
  { name: "Other", slug: "other", icon: "✨" },
  { name: "Beauty", slug: "beauty", icon: "💄" },
  { name: "Fitness", slug: "fitness", icon: "💪" },
  { name: "Food", slug: "food", icon: "🍔" },
  { name: "Travel", slug: "travel", icon: "✈️" },
  { name: "Technology", slug: "technology", icon: "📱" },
  { name: "Education", slug: "education", icon: "📚" },
  { name: "Finance", slug: "finance", icon: "💰" },
  { name: "Photography", slug: "photography", icon: "📷" },
  { name: "Business", slug: "business", icon: "💼" },
  { name: "Digital Marketing", slug: "digital-marketing", icon: "📣" },
  { name: "Entertainment", slug: "entertainment", icon: "🎪" },
  { name: "Health", slug: "health", icon: "❤️" },
] as const;

/** Pills shown in the main home/explore bar (icon + label). */
export const FEATURED_CATEGORY_SLUGS = [
  "memes",
  "videos",
  "music",
  "art",
  "gaming",
  "tech",
  "fashion",
  "lifestyle",
  "comedy",
  "devotional",
  "motivation",
  "dance",
  "health-wellness",
  "vlogs",
  "astrology",
  "news",
  "sports",
  "pets-animals",
  "automobile",
  "other",
] as const;

const CATALOG_BY_SLUG = new Map(CATEGORY_CATALOG.map((row) => [row.slug, row]));
const CATALOG_ORDER = new Map(CATEGORY_CATALOG.map((row, index) => [row.slug, index]));

export function categoryIcon(slug: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim();
  return CATALOG_BY_SLUG.get(slug)?.icon ?? "✨";
}

export function categoryLabel(slug: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim();
  return CATALOG_BY_SLUG.get(slug)?.name ?? slug;
}

export const ARENA_CATEGORY_TABS = [
  { label: "All", slug: "all", emoji: "🔥" },
  ...FEATURED_CATEGORY_SLUGS.map((slug) => {
    const row = CATALOG_BY_SLUG.get(slug);
    return {
      label: row?.name ?? slug,
      slug,
      emoji: row?.icon ?? "✨",
    };
  }),
] as const;

export const CREATOR_CATEGORY_OPTIONS = CATEGORY_CATALOG.map((row) => ({
  name: row.name,
  slug: row.slug,
}));

export type CreatorCategorySlug = (typeof CATEGORY_CATALOG)[number]["slug"];

/** Resolve the value sent as categoryId (UUID or slug) from form state. */
export function resolveCategorySubmitValue(input: {
  categoryId: string;
  category: string;
  categorySlug?: string;
}): string {
  const id = input.categoryId.trim();
  if (id) return id;
  const slug = input.categorySlug?.trim();
  if (slug) return slug;
  const byName = CATEGORY_CATALOG.find((c) => c.name === input.category.trim());
  return byName?.slug ?? "";
}

export type FeaturedCategorySlug = (typeof FEATURED_CATEGORY_SLUGS)[number];

const FLAVOR_COLORS = [
  "bg-hot-pink",
  "bg-sky",
  "bg-lavender",
  "bg-lemon",
  "bg-lime",
  "bg-coral",
  "bg-bubblegum",
] as const;

export const FLAVOR_CATEGORIES = [
  ...FEATURED_CATEGORY_SLUGS.map((slug, index) => {
    const row = CATALOG_BY_SLUG.get(slug);
    return {
      label: row?.name ?? slug,
      emoji: row?.icon ?? "✨",
      slug,
      aliases: (slug === "tech" ? ["technology"] : slug === "art" ? ["photography"] : []) as readonly string[],
      color: FLAVOR_COLORS[index % FLAVOR_COLORS.length],
      rotate: index % 2 === 0 ? -1 : 1,
    };
  }),
  {
    label: "Everything Viral",
    emoji: "🔥",
    slug: "all",
    aliases: [] as const,
    color: "bg-ink text-cream",
    rotate: 0,
  },
] as const;

export function exploreHrefForFlavor(slug: string, aliases: readonly string[], availableSlugs: string[]) {
  if (slug === "all") return "/explore";
  const match = [slug, ...aliases].find((s) => availableSlugs.includes(s));
  return `/explore?category=${match ?? slug}`;
}

export function sortCategoriesForUi<T extends { slug: string; name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ai = CATALOG_ORDER.get(a.slug) ?? 1000;
    const bi = CATALOG_ORDER.get(b.slug) ?? 1000;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function splitNavCategories<T extends { slug: string; name: string; icon?: string | null }>(rows: T[]) {
  const featured = new Set<string>(FEATURED_CATEGORY_SLUGS);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const primary = FEATURED_CATEGORY_SLUGS.map((slug) => {
    const hit = bySlug.get(slug);
    if (hit) return hit;
    const meta = CATALOG_BY_SLUG.get(slug);
    if (!meta) return null;
    return { slug: meta.slug, name: meta.name, icon: meta.icon } as T;
  }).filter(Boolean) as T[];
  const more = rows.filter((row) => !featured.has(row.slug));
  return { primary, more };
}
