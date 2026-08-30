export type SupabaseConfigStatus = {
  configured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  canSubmitCreators: boolean;
  missing: string[];
  anonKeyFormat?: "sb_publishable" | "sb_secret" | "legacy_jwt" | "missing" | "unknown";
  serviceRoleKeyFormat?: "sb_publishable" | "sb_secret" | "legacy_jwt" | "missing" | "unknown";
  /** True when NEXT_PUBLIC_SUPABASE_URL was pasted as the /rest/v1 endpoint */
  urlIncludesRestV1Path?: boolean;
};

/** Project origin only — strips accidental `/rest/v1` dashboard paste that causes PGRST125 on writes. */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/, "");
    url.search = "";
    url.hash = "";
    const normalized = url.toString().replace(/\/$/, "");
    return normalized || `${url.protocol}//${url.host}`;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  }
}

export function supabaseUrlIncludesRestV1Path(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    return /\/rest\/v1\/?$/.test(new URL(raw.trim()).pathname);
  } catch {
    return /\/rest\/v1\/?$/.test(raw.trim());
  }
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const hasAnonKey = Boolean(anonKey);
  const hasServiceRoleKey = Boolean(serviceKey);
  const missing: string[] = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!hasServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  function keyFormat(key: string | undefined) {
    if (!key) return "missing" as const;
    if (key.startsWith("sb_publishable_")) return "sb_publishable" as const;
    if (key.startsWith("sb_secret_")) return "sb_secret" as const;
    if (key.startsWith("eyJ")) return "legacy_jwt" as const;
    return "unknown" as const;
  }

  return {
    configured: hasUrl && hasAnonKey,
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    canSubmitCreators: hasUrl && hasServiceRoleKey,
    missing,
    anonKeyFormat: keyFormat(anonKey),
    serviceRoleKeyFormat: keyFormat(serviceKey),
    urlIncludesRestV1Path: supabaseUrlIncludesRestV1Path(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
}
