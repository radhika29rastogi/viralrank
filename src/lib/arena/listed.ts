import { createAdminClient } from "@/lib/supabase/admin";
import type { InstagramProfileSnapshot } from "@/lib/instagram/types";

export type ListedCreatorRow = {
  id: string;
  instagram_username: string;
  name: string;
  profile_image_url: string | null;
  followers: number | null;
  bio: string | null;
  stats_fetched_at: string | null;
};

export async function getListedCreator(handle: string): Promise<ListedCreatorRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("creators")
    .select("id, instagram_username, name, profile_image_url, followers, bio, stats_fetched_at")
    .eq("instagram_username", handle)
    .maybeSingle();
  return (data as ListedCreatorRow | null) ?? null;
}

export function listedCreatorToSnapshot(row: ListedCreatorRow): InstagramProfileSnapshot {
  return {
    handle: row.instagram_username,
    displayName: row.name || row.instagram_username,
    profilePhotoUrl: row.profile_image_url || "/viralrank-logo.jpg",
    followerCount: Number(row.followers ?? 0),
    bio: row.bio,
    isVerified: false,
    fetchedAt: row.stats_fetched_at || new Date().toISOString(),
  };
}
