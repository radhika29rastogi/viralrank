import { createHmac } from "node:crypto";
import {
  instagramProfileUrl,
  parseInstagramProfileInput,
} from "@/lib/instagram/username";

export type InstagramProfile = {
  username: string;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  followers: number | null;
  averageViews: number | null;
  url: string;
};

export type InstagramFetchErrorCode =
  | "empty"
  | "invalid_username"
  | "not_found"
  | "unsupported_account"
  | "private_account"
  | "insufficient_permissions"
  | "auth"
  | "missing_config"
  | "rate_limit"
  | "network"
  | "unavailable";

export type InstagramConfigStatus = {
  configured: boolean;
  hasAccessToken: boolean;
  hasBusinessAccountId: boolean;
  hasClientSecret: boolean;
  apiVersion: string;
  apiHost: "graph.facebook.com";
  api: "instagram_graph_business_discovery";
  missing: string[];
};

export type InstagramFetchSuccess = {
  available: true;
  profile: InstagramProfile;
  metrics: { followers: number | null; averageViews: number | null };
  missingFields: string[];
};

export type InstagramFetchFailure = {
  available: false;
  code: InstagramFetchErrorCode;
  message: string;
  username?: string;
  url?: string;
  /** Safe machine hint for missing_config only — never secrets. */
  reason?: "missing_token" | "missing_business_account_id";
};

export type InstagramFetchResult = InstagramFetchSuccess | InstagramFetchFailure;

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
  };
};

type GraphMedia = {
  view_count?: number;
  media_type?: string;
  media_product_type?: string;
};

type BusinessDiscoveryBody = GraphErrorBody & {
  business_discovery?: {
    username?: string;
    name?: string;
    biography?: string;
    website?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
    media?: { data?: GraphMedia[] };
  };
};

type CachedFetch = {
  username: string;
  followers: number | null;
  averageViews: number | null;
  expiresAt: number;
};

const FETCH_CACHE_TTL_MS = 15 * 60 * 1000;
const GRAPH_TIMEOUT_MS = 12_000;
const DEFAULT_GRAPH_VERSION = "v21.0";
const DISCOVERY_FIELDS =
  "username,name,biography,website,profile_picture_url,followers_count,media_count,media.limit(25){view_count,media_type,media_product_type}";
const DISCOVERY_FIELDS_BASIC =
  "username,name,biography,website,profile_picture_url,followers_count,media_count";

const fetchCache = new Map<string, CachedFetch>();
let resolvedAccountId: string | null = null;
let missingConfigLogged = false;

function graphVersion() {
  const raw = process.env.INSTAGRAM_GRAPH_API_VERSION?.trim();
  if (!raw) return DEFAULT_GRAPH_VERSION;
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function accessToken() {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || "";
}

function appSecretProof(token: string) {
  const secret = process.env.INSTAGRAM_CLIENT_SECRET?.trim();
  if (!secret) return undefined;
  return createHmac("sha256", secret).update(token).digest("hex");
}

function asFiniteInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function averageVideoViews(media: GraphMedia[] | undefined): number | null {
  if (!media?.length) return null;
  const views = media
    .map((item) => asFiniteInt(item.view_count))
    .filter((n): n is number => n != null);
  if (!views.length) return null;
  return Math.round(views.reduce((sum, n) => sum + n, 0) / views.length);
}

function rememberFetchedMetrics(username: string, followers: number | null, averageViews: number | null) {
  fetchCache.set(username.toLowerCase(), {
    username: username.toLowerCase(),
    followers,
    averageViews,
    expiresAt: Date.now() + FETCH_CACHE_TTL_MS,
  });
}

export function matchFetchedProfile(input: {
  username: string;
  followers: number | null | undefined;
  averageViews: number | null | undefined;
}) {
  const cached = fetchCache.get(input.username.toLowerCase());
  if (!cached || cached.expiresAt < Date.now()) return false;
  const followers = Number.isFinite(input.followers) ? Number(input.followers) : null;
  const averageViews = Number.isFinite(input.averageViews) ? Number(input.averageViews) : null;
  return cached.followers === followers && cached.averageViews === averageViews;
}

function logMissingConfig(detail: string) {
  if (missingConfigLogged) return;
  missingConfigLogged = true;
  console.error(`[instagram/fetch] ${detail}`);
}

export function getInstagramConfigStatus(): InstagramConfigStatus {
  const hasAccessToken = Boolean(accessToken());
  const hasBusinessAccountId = Boolean(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim());
  const hasClientSecret = Boolean(process.env.INSTAGRAM_CLIENT_SECRET?.trim());
  const missing: string[] = [];
  if (!hasAccessToken) missing.push("INSTAGRAM_ACCESS_TOKEN");
  if (!hasBusinessAccountId) missing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  return {
    configured: hasAccessToken && hasBusinessAccountId,
    hasAccessToken,
    hasBusinessAccountId,
    hasClientSecret,
    apiVersion: graphVersion(),
    apiHost: "graph.facebook.com",
    api: "instagram_graph_business_discovery",
    missing,
  };
}

function userMessage(code: InstagramFetchErrorCode): string {
  switch (code) {
    case "empty":
      return "Enter an Instagram username or URL.";
    case "invalid_username":
      return "Enter a valid Instagram username (letters, numbers, periods, underscores).";
    case "not_found":
      return "We couldn't find that Instagram profile. Check the username, or enter details manually.";
    case "unsupported_account":
      return "This Instagram account cannot be fetched through Meta's API. You can enter the creator details manually.";
    case "private_account":
      return "This Instagram account cannot be fetched through Meta's API. You can enter the creator details manually.";
    case "insufficient_permissions":
      return "Instagram lookup is missing required Meta permissions. Enter details manually, or update the access token scopes.";
    case "auth":
      return "Instagram access token is invalid or expired. Enter details manually, or refresh the server token.";
    case "missing_config":
      return "Instagram lookup is not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID to the server environment.";
    case "rate_limit":
      return "Instagram is rate-limiting lookups right now. Wait a moment, or enter details manually.";
    case "network":
      return "We couldn't reach Meta Graph API right now. Check your connection, or enter details manually.";
    default:
      return "We couldn't automatically fetch Instagram details. Please enter them manually.";
  }
}

function fail(
  code: InstagramFetchErrorCode,
  extras?: {
    username?: string;
    url?: string;
    message?: string;
    reason?: InstagramFetchFailure["reason"];
  },
): InstagramFetchFailure {
  return {
    available: false,
    code,
    message: extras?.message || userMessage(code),
    username: extras?.username,
    url: extras?.url,
    reason: extras?.reason,
  };
}

function mapGraphError(
  body: GraphErrorBody | null,
  username: string,
): InstagramFetchErrorCode {
  const err = body?.error;
  const code = err?.code;
  const sub = err?.error_subcode;
  const message = (err?.message || "").toLowerCase();

  if (code === 4 || code === 17 || code === 32 || code === 613) return "rate_limit";
  if (code === 190 || code === 102 || code === 104) return "auth";
  if (code === 10 || code === 200 || code === 294) return "insufficient_permissions";
  if (code === 803) return "not_found";

  if (message.includes("private") || message.includes("not visible")) {
    return "private_account";
  }

  if (
    sub === 2207013 ||
    sub === 2207004 ||
    message.includes("not a business") ||
    message.includes("not a professional") ||
    message.includes("unsupported") ||
    message.includes("age-gated") ||
    message.includes("age gated")
  ) {
    return "unsupported_account";
  }

  if (
    sub === 2207001 ||
    sub === 2207020 ||
    message.includes("does not exist") ||
    message.includes("unknown user")
  ) {
    return "not_found";
  }

  if (message.includes("invalid user id") || sub === 33) {
    return "unsupported_account";
  }

  if (message.includes("permission") || message.includes("(#10)") || message.includes("(#200)")) {
    return "insufficient_permissions";
  }

  if (message.includes("oauth") || message.includes("access token") || message.includes("session has expired")) {
    return "auth";
  }

  console.error("[instagram/fetch] Meta Graph API error", {
    username,
    code,
    subcode: sub,
    type: err?.type,
  });
  return "unavailable";
}

async function graphGet<T>(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<{ ok: true; status: number; body: T } | { ok: false; status: number; body: GraphErrorBody | null; network?: boolean }> {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", token);
  const proof = appSecretProof(token);
  if (proof) url.searchParams.set("appsecret_proof", proof);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    let body: T & GraphErrorBody;
    try {
      body = (await res.json()) as T & GraphErrorBody;
    } catch {
      return { ok: false, status: res.status, body: null, network: true };
    }
    if (!res.ok || body.error) {
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, body };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, status: 0, body: null, network: true };
    }
    return { ok: false, status: 0, body: null, network: true };
  }
}

async function resolveBusinessAccountId(token: string): Promise<string | null> {
  const configured = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  if (configured) return configured;
  if (resolvedAccountId) return resolvedAccountId;

  const me = await graphGet<{ instagram_business_account?: { id?: string } }>(
    "me",
    { fields: "instagram_business_account" },
    token,
  );
  if (me.ok) {
    const id = me.body.instagram_business_account?.id;
    if (id) {
      resolvedAccountId = id;
      return id;
    }
  }

  const accounts = await graphGet<{ data?: Array<{ instagram_business_account?: { id?: string } }> }>(
    "me/accounts",
    { fields: "instagram_business_account" },
    token,
  );
  if (accounts.ok) {
    const id = accounts.body.data?.find((page) => page.instagram_business_account?.id)
      ?.instagram_business_account?.id;
    if (id) {
      resolvedAccountId = id;
      return id;
    }
  }

  return null;
}

function toProfile(
  username: string,
  discovery: NonNullable<BusinessDiscoveryBody["business_discovery"]>,
): InstagramFetchSuccess {
  const resolvedUsername = (discovery.username || username).toLowerCase();
  const followers = asFiniteInt(discovery.followers_count);
  const averageViews = averageVideoViews(discovery.media?.data);
  const name = discovery.name?.trim() || null;
  const bio = discovery.biography?.trim() || null;
  const profileImageUrl = discovery.profile_picture_url?.trim() || null;

  const missingFields: string[] = [];
  if (!name) missingFields.push("name");
  if (!bio) missingFields.push("bio");
  if (!profileImageUrl) missingFields.push("image");
  if (followers == null) missingFields.push("followers");
  if (averageViews == null) missingFields.push("average views");

  rememberFetchedMetrics(resolvedUsername, followers, averageViews);

  return {
    available: true,
    profile: {
      username: resolvedUsername,
      name,
      bio,
      profileImageUrl,
      followers,
      averageViews,
      url: instagramProfileUrl(resolvedUsername),
    },
    metrics: { followers, averageViews },
    missingFields,
  };
}

export function normalizeInstagramData(input: string) {
  const parsed = parseInstagramProfileInput(input);
  if (!parsed.ok) {
    return { username: "", url: "" };
  }
  return {
    username: parsed.username,
    url: instagramProfileUrl(parsed.username),
  };
}

export async function fetchInstagramProfile(input: string): Promise<InstagramFetchResult> {
  const parsed = parseInstagramProfileInput(input);
  if (!parsed.ok) {
    return fail(parsed.code, { message: parsed.message });
  }

  const username = parsed.username;
  const url = instagramProfileUrl(username);
  const token = accessToken();

  if (!token) {
    logMissingConfig(
      "Missing INSTAGRAM_ACCESS_TOKEN. Set a long-lived Facebook User access token (Instagram API with Facebook Login) plus INSTAGRAM_BUSINESS_ACCOUNT_ID.",
    );
    return fail("missing_config", {
      username,
      url,
      reason: "missing_token",
      message:
        "Instagram lookup is not configured. Add INSTAGRAM_ACCESS_TOKEN (and INSTAGRAM_BUSINESS_ACCOUNT_ID) to the server environment.",
    });
  }

  const igUserId = await resolveBusinessAccountId(token);
  if (!igUserId) {
    logMissingConfig(
      "INSTAGRAM_BUSINESS_ACCOUNT_ID is missing and could not be resolved from the access token. Set the IG User id of your Page-linked professional Instagram account.",
    );
    return fail("missing_config", {
      username,
      url,
      reason: "missing_business_account_id",
      message:
        "Instagram lookup is not configured. Add INSTAGRAM_BUSINESS_ACCOUNT_ID (your professional IG User id linked to a Facebook Page).",
    });
  }

  const fields = `business_discovery.username(${username}){${DISCOVERY_FIELDS}}`;
  let result = await graphGet<BusinessDiscoveryBody>(igUserId, { fields }, token);

  if (!result.ok && result.body?.error?.message?.toLowerCase().includes("nonexisting field")) {
    result = await graphGet<BusinessDiscoveryBody>(
      igUserId,
      { fields: `business_discovery.username(${username}){${DISCOVERY_FIELDS_BASIC}}` },
      token,
    );
  }

  if (!result.ok) {
    if (result.network) return fail("network", { username, url });
    if (result.status === 429) return fail("rate_limit", { username, url });
    const code = mapGraphError(result.body, username);
    return fail(code, { username, url });
  }

  const discovery = result.body.business_discovery;
  if (!discovery || (!discovery.username && discovery.followers_count == null && !discovery.name)) {
    return fail("not_found", { username, url });
  }

  return toProfile(username, discovery);
}

export async function fetchInstagramMetrics(username: string): Promise<InstagramFetchResult> {
  return fetchInstagramProfile(username);
}
