export type InstagramProfileSnapshot = {
  handle: string;
  displayName: string;
  profilePhotoUrl: string;
  followerCount: number;
  bio: string | null;
  isVerified: boolean;
  fetchedAt: string;
};

export type InstagramLookupErrorCode =
  | "config"
  | "auth"
  | "rate_limit"
  | "not_found"
  | "unknown"
  | "invalid";

export const INSTAGRAM_LOOKUP_MESSAGES = {
  config: "API key not configured",
  auth: "API key invalid or expired",
  rate_limit: "API quota exceeded, try again later",
  not_found: "Couldn't find that Instagram profile — check the username and try again",
  unknown: "Something went wrong fetching this profile",
} as const;
