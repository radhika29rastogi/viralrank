export const FEATURED_CATEGORY_SLUGS = [
  "memes",
  "videos",
  "music",
  "art",
  "gaming",
  "tech",
  "fashion",
  "lifestyle",
] as const;

export const CREATOR_CATEGORY_OPTIONS = [
  { name: "Memes", slug: "memes" },
  { name: "Videos", slug: "videos" },
  { name: "Music", slug: "music" },
  { name: "Art", slug: "art" },
  { name: "Gaming", slug: "gaming" },
  { name: "Tech", slug: "tech" },
  { name: "Fashion", slug: "fashion" },
  { name: "Lifestyle", slug: "lifestyle" },
] as const;

export type CreatorCategorySlug = (typeof CREATOR_CATEGORY_OPTIONS)[number]["slug"];

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
  const byName = CREATOR_CATEGORY_OPTIONS.find((c) => c.name === input.category.trim());
  return byName?.slug ?? "";
}

export type FeaturedCategorySlug = (typeof FEATURED_CATEGORY_SLUGS)[number];

export const FLAVOR_CATEGORIES = [
  { label: "Memes", emoji: "😂", slug: "memes", aliases: ["comedy"], color: "bg-hot-pink", rotate: -1 },
  { label: "Videos", emoji: "🎬", slug: "videos", aliases: [], color: "bg-sky", rotate: 1 },
  { label: "Music", emoji: "🎵", slug: "music", aliases: [], color: "bg-lavender", rotate: -1 },
  { label: "Art", emoji: "🎨", slug: "art", aliases: ["photography"], color: "bg-lemon", rotate: 1 },
  { label: "Gaming", emoji: "🎮", slug: "gaming", aliases: [], color: "bg-lime", rotate: -1 },
  { label: "Tech", emoji: "💻", slug: "tech", aliases: ["technology"], color: "bg-coral", rotate: 1 },
  { label: "Fashion", emoji: "👗", slug: "fashion", aliases: [], color: "bg-bubblegum", rotate: -1 },
  { label: "Lifestyle", emoji: "📸", slug: "lifestyle", aliases: [], color: "bg-sky", rotate: 1 },
  {
    label: "Everything Viral",
    emoji: "🔥",
    slug: "all",
    aliases: [],
    color: "bg-ink text-cream",
    rotate: 0,
  },
] as const;

export function exploreHrefForFlavor(slug: string, aliases: readonly string[], availableSlugs: string[]) {
  if (slug === "all") return "/explore";
  const match = [slug, ...aliases].find((s) => availableSlugs.includes(s));
  return `/explore?category=${match ?? slug}`;
}
