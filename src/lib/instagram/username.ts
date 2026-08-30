/** Instagram profile username parsing for Rank a Creator — no client-side scraping. */

const RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "api",
  "challenge",
  "developer",
  "direct",
  "directory",
  "emails",
  "explore",
  "graphql",
  "highlights",
  "inbox",
  "instagram",
  "legal",
  "lite",
  "locations",
  "p",
  "popular",
  "privacy",
  "reel",
  "reels",
  "session",
  "share",
  "stories",
  "tags",
  "terms",
  "tv",
  "web",
]);

export const INSTAGRAM_USERNAME_MAX = 30;

export type InstagramUsernameParse =
  | { ok: true; username: string }
  | { ok: false; code: "empty" | "invalid_username"; message: string };

function isInstagramHost(hostname: string) {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  return host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am";
}

function cleanSegment(value: string) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return decoded
    .trim()
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();
}

export function isValidInstagramUsername(username: string) {
  if (!username || username.length > INSTAGRAM_USERNAME_MAX) return false;
  if (RESERVED_PATHS.has(username.toLowerCase())) return false;
  if (!/^[A-Za-z0-9._]+$/.test(username)) return false;
  if (username.startsWith(".") || username.endsWith(".")) return false;
  if (username.includes("..")) return false;
  return true;
}

function tryParseInstagramUrl(raw: string): string | undefined {
  let url: URL;
  try {
    if (/^https?:\/\//i.test(raw)) {
      url = new URL(raw);
    } else if (/^(www\.)?(instagram\.com|instagr\.am)\//i.test(raw)) {
      url = new URL(`https://${raw}`);
    } else {
      return undefined;
    }
  } catch {
    return "";
  }

  if (!isInstagramHost(url.hostname)) return "";

  const parts = url.pathname.split("/").filter(Boolean).map(cleanSegment);
  if (parts.length === 0) return "";

  const first = parts[0] ?? "";
  if (first === "stories" || first === "highlights") {
    return parts[1] ?? "";
  }
  if (RESERVED_PATHS.has(first)) {
    return "";
  }
  return first;
}

export function parseInstagramProfileInput(input: string): InstagramUsernameParse {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty",
      message: "Enter an Instagram username or URL.",
    };
  }

  const fromUrl = tryParseInstagramUrl(trimmed);
  let username: string;
  if (fromUrl === undefined) {
    username = cleanSegment(trimmed);
  } else {
    username = fromUrl;
  }

  if (!username) {
    return {
      ok: false,
      code: "invalid_username",
      message: "That doesn't look like an Instagram profile. Use @username or a profile URL.",
    };
  }

  if (!isValidInstagramUsername(username)) {
    return {
      ok: false,
      code: "invalid_username",
      message: "Enter a valid Instagram username (letters, numbers, periods, underscores).",
    };
  }

  return { ok: true, username };
}

export function instagramProfileUrl(username: string) {
  return `https://www.instagram.com/${username}/`;
}

export const USERNAME_PARSE_EXAMPLES: Array<{ input: string; username: string | null }> = [
  { input: "@thefitnessgyaan_", username: "thefitnessgyaan_" },
  { input: "thefitnessgyaan_", username: "thefitnessgyaan_" },
  { input: "https://www.instagram.com/thefitnessgyaan_/", username: "thefitnessgyaan_" },
  { input: "https://www.instagram.com/thefitnessgyaan_/?hl=en", username: "thefitnessgyaan_" },
  { input: "https://instagram.com/thefitnessgyaan_/reels/", username: "thefitnessgyaan_" },
  { input: "www.instagram.com/thefitnessgyaan_/", username: "thefitnessgyaan_" },
  { input: "https://www.instagram.com/p/ABC123/", username: null },
  { input: "", username: null },
];
