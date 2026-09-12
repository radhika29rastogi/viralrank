import { createAdminClient } from "@/lib/supabase/admin";
import { parseInstagramProfileInput } from "@/lib/instagram/username";
import {
  INSTAGRAM_LOOKUP_MESSAGES,
  type InstagramLookupErrorCode,
  type InstagramProfileSnapshot,
} from "@/lib/instagram/types";

export type { InstagramProfileSnapshot } from "@/lib/instagram/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 10_000;
const USER_INFO_PATH = "/profile";

export type InstagramLookupResult =
  | { ok: true; profile: InstagramProfileSnapshot; cached: boolean }
  | { ok: false; error: InstagramLookupErrorCode; message: string; status: number };

function fail(
  error: Exclude<InstagramLookupErrorCode, "invalid">,
  status: number,
): InstagramLookupResult;
function fail(error: "invalid", status: number, message: string): InstagramLookupResult;
function fail(
  error: InstagramLookupErrorCode,
  status: number,
  message?: string,
): InstagramLookupResult {
  return {
    ok: false,
    error,
    message:
      message ??
      INSTAGRAM_LOOKUP_MESSAGES[error as Exclude<InstagramLookupErrorCode, "invalid">],
    status,
  };
}

function rapidConfig() {
  const key = process.env.RAPIDAPI_KEY?.trim();
  const host = (process.env.RAPIDAPI_HOST || process.env.RAPIDAPI_INSTAGRAM_HOST || "").trim();
  return { key, host };
}

function asCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  return null;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function edgeCount(value: unknown) {
  const edge = asRecord(value);
  return edge ? asCount(edge.count) : null;
}

function looksMissing(raw: Record<string, unknown>, status: number) {
  if (status === 404) return true;
  const blob = JSON.stringify(raw).toLowerCase();
  if (blob.includes("user not found") || blob.includes("username not found")) return true;
  if (raw.status === false || raw.success === false) return true;
  if (asText(raw.message)?.toLowerCase().includes("not found")) return true;
  if (asText(raw.error)?.toLowerCase().includes("not found")) return true;
  return false;
}

function unwrapUser(raw: Record<string, unknown>): Record<string, unknown> {
  const graphqlUser = asRecord(asRecord(asRecord(raw.data)?.user) ?? asRecord(raw.graphql)?.user);
  return (
    graphqlUser ??
    asRecord(raw.data) ??
    asRecord(raw.user) ??
    asRecord(raw.profile) ??
    asRecord(raw.result) ??
    raw
  );
}

function pickProfile(handle: string, raw: Record<string, unknown>): InstagramProfileSnapshot | null {
  const data = unwrapUser(raw);
  const displayName =
    asText(data.full_name) ??
    asText(data.fullName) ??
    asText(data.name) ??
    asText(data.display_name) ??
    handle;
  const photo =
    asText(data.profile_pic_url_hd) ??
    asText(data.hd_profile_pic_url_info && asRecord(data.hd_profile_pic_url_info)?.url) ??
    asText(data.profile_pic_url) ??
    asText(data.profilePicUrl) ??
    asText(data.profile_picture) ??
    asText(data.profile_photo_url) ??
    asText(data.avatar);
  const followers =
    asCount(data.follower_count) ??
    asCount(data.followers) ??
    asCount(data.followerCount) ??
    edgeCount(data.edge_followed_by);
  const bio = asText(data.biography) ?? asText(data.bio);
  const isVerified = Boolean(data.is_verified ?? data.isVerified ?? data.verified);

  if (!photo || followers == null) return null;
  return {
    handle: asText(data.username)?.toLowerCase() || handle,
    displayName,
    profilePhotoUrl: photo,
    followerCount: followers,
    bio,
    isVerified,
    fetchedAt: new Date().toISOString(),
  };
}

async function cacheSnapshot(
  handle: string,
  profile: InstagramProfileSnapshot,
  raw: Record<string, unknown>,
) {
  const admin = createAdminClient();
  if (!admin) return;

  const { error: cacheError } = await admin.from("instagram_profile_cache").upsert({
    handle,
    display_name: profile.displayName,
    profile_photo_url: profile.profilePhotoUrl,
    follower_count: profile.followerCount,
    bio: profile.bio,
    is_verified: profile.isVerified,
    payload: raw,
    fetched_at: profile.fetchedAt,
  });
  if (cacheError) {
    console.error("[instagram/lookup] cache upsert failed", cacheError.message);
  }

  const { error: creatorError } = await admin
    .from("creators")
    .update({
      name: profile.displayName,
      profile_image_url: profile.profilePhotoUrl,
      followers: profile.followerCount,
      bio: profile.bio,
      stats_fetched_at: profile.fetchedAt,
      instagram_data_source: "instagram",
    })
    .eq("instagram_username", handle);
  if (creatorError) {
    console.error("[instagram/lookup] creator stats update failed", creatorError.message);
  }
}

async function readCached(handle: string): Promise<InstagramProfileSnapshot | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const freshAfter = Date.now() - CACHE_TTL_MS;

  const { data: cached } = await admin
    .from("instagram_profile_cache")
    .select("handle, display_name, profile_photo_url, follower_count, bio, is_verified, fetched_at")
    .eq("handle", handle)
    .maybeSingle();
  if (
    cached?.fetched_at &&
    new Date(cached.fetched_at).getTime() > freshAfter &&
    cached.profile_photo_url &&
    cached.follower_count != null
  ) {
    return {
      handle,
      displayName: cached.display_name || handle,
      profilePhotoUrl: cached.profile_photo_url,
      followerCount: Number(cached.follower_count),
      bio: cached.bio,
      isVerified: Boolean(cached.is_verified),
      fetchedAt: cached.fetched_at,
    };
  }

  const { data: creator } = await admin
    .from("creators")
    .select("name, profile_image_url, followers, bio, stats_fetched_at")
    .eq("instagram_username", handle)
    .maybeSingle();
  if (
    creator?.stats_fetched_at &&
    new Date(creator.stats_fetched_at).getTime() > freshAfter &&
    creator.profile_image_url &&
    creator.followers != null
  ) {
    return {
      handle,
      displayName: creator.name || handle,
      profilePhotoUrl: creator.profile_image_url,
      followerCount: Number(creator.followers),
      bio: creator.bio,
      isVerified: false,
      fetchedAt: creator.stats_fetched_at,
    };
  }

  return null;
}

async function fetchFromRapidApi(handle: string): Promise<InstagramLookupResult> {
  const { key, host } = rapidConfig();
  if (!key || !host) {
    return fail("config", 503);
  }

  const url = `https://${host}${USER_INFO_PATH}?username=${encodeURIComponent(handle)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[instagram/lookup] RapidAPI request failed", err);
    return fail("unknown", 502);
  }

  if (res.status === 401 || res.status === 403) {
    return fail("auth", res.status);
  }
  if (res.status === 429) {
    return fail("rate_limit", 429);
  }

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error("[instagram/lookup] RapidAPI returned non-JSON", res.status, err);
    if (res.status === 404) return fail("not_found", 404);
    return fail("unknown", 502);
  }

  console.log("[instagram/lookup] raw RapidAPI response", JSON.stringify(json));

  if (looksMissing(json, res.status)) {
    return fail("not_found", 404);
  }
  if (!res.ok) {
    console.error("[instagram/lookup] RapidAPI HTTP", res.status, json);
    return fail("unknown", 502);
  }

  const profile = pickProfile(handle, json);
  if (!profile) {
    console.error("[instagram/lookup] could not map RapidAPI fields", Object.keys(unwrapUser(json)));
    return fail("unknown", 502);
  }
  await cacheSnapshot(handle, profile, json);
  return { ok: true, profile, cached: false };
}

export async function lookupInstagramProfile(rawInput: string): Promise<InstagramLookupResult> {
  const parsed = parseInstagramProfileInput(rawInput);
  if (!parsed.ok) {
    return fail("invalid", 400, parsed.message);
  }

  const handle = parsed.username;
  const cached = await readCached(handle);
  if (cached) {
    return { ok: true, profile: cached, cached: true };
  }

  const { key, host } = rapidConfig();
  if (!key || !host) {
    return fail("config", 503);
  }

  return fetchFromRapidApi(handle);
}
