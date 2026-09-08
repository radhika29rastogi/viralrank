/** Shared security helpers — redirects, URLs, safe cookies. */

export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  return value;
}

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
  "www.instagr.am",
]);

export function isAllowedInstagramUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return INSTAGRAM_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function isOwnStorageImageUrl(raw: string, supabaseUrl?: string): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const base = supabaseUrl ? new URL(supabaseUrl).hostname.toLowerCase() : "";
    const host = url.hostname.toLowerCase();
    if (base && host === base && url.pathname.includes("/storage/v1/object/public/creator-images/")) {
      return true;
    }
    return host.endsWith(".supabase.co") && url.pathname.includes("/creator-images/");
  } catch {
    return false;
  }
}

export function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

/** JPEG / PNG / WebP magic-byte sniff. */
export function detectImageMime(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Safe JSON for API clients. Extra fields stay in server logs only in production. */
export function publicErrorBody(
  error: string,
  extras?: Record<string, unknown>,
): { error: string } & Record<string, unknown> {
  if (process.env.NODE_ENV === "production") {
    return extras?.code && typeof extras.code === "string"
      ? { error, code: extras.code }
      : { error };
  }
  return extras ? { error, ...extras } : { error };
}

export async function writeSecurityAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  event: { eventType: string; actorUserId?: string | null; targetId?: string; meta?: Record<string, unknown> },
) {
  try {
    await admin.from("security_audit_log").insert({
      event_type: event.eventType,
      actor_user_id: event.actorUserId ?? null,
      target_id: event.targetId ?? null,
      meta: event.meta ?? {},
    });
  } catch {
    // Never fail the request because audit insert failed.
  }
}
