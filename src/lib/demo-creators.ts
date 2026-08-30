import type { Creator } from "@/types/database";

function demoCreator(
  username: string,
  category: string,
  followers: number,
  rank: number,
  hype: number,
  scoreHint: number,
): Creator {
  const now = new Date().toISOString();
  return {
    id: `demo-${username}`,
    user_id: null,
    instagram_username: username,
    instagram_url: `https://www.instagram.com/${username}/`,
    name: username.replace(/_/g, " "),
    bio: null,
    profile_image_url: null,
    category_id: null,
    location: "Internet",
    contact_email: "hello@viralrank.buzz",
    contact_phone: null,
    followers,
    average_views: null,
    instagram_data_source: "creator_provided",
    current_highest_bid: scoreHint * 20,
    current_rank: rank,
    rank_set_at: now,
    profile_clicks: Math.round(followers / 40),
    hype_count: Math.round(hype / 50),
    total_hype_amount: hype,
    status: "approved",
    created_at: now,
    updated_at: now,
    categories: { id: `demo-cat-${category}`, name: category, slug: category.toLowerCase() },
  };
}

export const DEMO_CREATORS: Creator[] = [
  demoCreator("memelord_42", "Memes", 124000, 12, 8200, 94),
  demoCreator("chaotic_energy", "Videos", 89000, 18, 6400, 87),
  demoCreator("vibe_checker", "Lifestyle", 56000, 24, 4100, 81),
  demoCreator("pixel_witch", "Gaming", 210000, 5, 12700, 96),
  demoCreator("trendsetter_x", "Fashion", 76000, 15, 5700, 91),
  demoCreator("techwithsam", "Tech", 145000, 8, 9100, 93),
  demoCreator("artbyriya", "Art", 62000, 21, 4800, 88),
  demoCreator("musicmoodz", "Music", 98000, 14, 7300, 90),
  demoCreator("dailychaos", "Memes", 187000, 6, 11200, 95),
  demoCreator("thevideoguy", "Videos", 115000, 16, 6900, 89),
  demoCreator("fitandfire", "Lifestyle", 72000, 19, 5200, 84),
  demoCreator("glitchqueen", "Gaming", 134000, 9, 8800, 92),
];

export function creatorsForCarousel(real: Creator[]) {
  if (real.length >= 8) return real.slice(0, 12);
  const seen = new Set(real.map((c) => c.instagram_username.toLowerCase()));
  const extras = DEMO_CREATORS.filter((c) => !seen.has(c.instagram_username.toLowerCase()));
  return [...real, ...extras].slice(0, 12);
}
