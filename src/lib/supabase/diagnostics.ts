import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import type { PostgrestError } from "@supabase/supabase-js";

export type SupabaseKeyFormat = "sb_publishable" | "sb_secret" | "legacy_jwt" | "missing" | "unknown";

export type SupabaseProbeResult = {
  ok: boolean;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  httpStatus?: number;
  /** DNS / network cause when fetch fails at the transport layer */
  cause?: string;
};

export type SupabaseDiagnostics = {
  urlHost: string | null;
  anonKeyFormat: SupabaseKeyFormat;
  serviceRoleKeyFormat: SupabaseKeyFormat;
  urlIncludesRestV1Path: boolean;
  urlReachable: SupabaseProbeResult;
  anonQuery: SupabaseProbeResult;
  serviceRoleQuery: SupabaseProbeResult;
  categoriesTable: SupabaseProbeResult;
  projectPausedOrMissing?: boolean;
};

function detectKeyFormat(key: string | undefined): SupabaseKeyFormat {
  if (!key?.trim()) return "missing";
  if (key.startsWith("sb_publishable_")) return "sb_publishable";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("eyJ")) return "legacy_jwt";
  return "unknown";
}

function parseUrlHost(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).host;
  } catch {
    return null;
  }
}

function fromPostgrestError(error: PostgrestError | null): SupabaseProbeResult {
  if (!error) {
    return { ok: true, message: "ok" };
  }
  const details = error.details ?? undefined;
  const cause = extractFetchCause(details ?? error.message);
  return {
    ok: false,
    message: error.message,
    code: error.code || undefined,
    details,
    hint: error.hint || undefined,
    cause,
  };
}

function extractFetchCause(text: string): string | undefined {
  const enotfound = text.match(/getaddrinfo ENOTFOUND ([^\s(]+)/i);
  if (enotfound) return `DNS lookup failed for ${enotfound[1]} (ENOTFOUND)`;
  const causeLine = text.match(/Caused by: ([^\n]+)/i);
  if (causeLine) return causeLine[1].trim();
  return undefined;
}

function isProjectMissingSignal(message: string, details?: string, cause?: string): boolean {
  const blob = `${message} ${details ?? ""} ${cause ?? ""}`.toLowerCase();
  return blob.includes("enotfound") || blob.includes("non-existent domain");
}

function fromFetchException(error: unknown): SupabaseProbeResult {
  const err = error as Error & {
    cause?: Error & { code?: string; hostname?: string };
    code?: string;
    hostname?: string;
  };
  const causeMsg =
    err.cause?.message ??
    (err.code === "ENOTFOUND" && err.hostname
      ? `getaddrinfo ENOTFOUND ${err.hostname}`
      : undefined);
  return {
    ok: false,
    message: err.message || "Request failed",
    code: err.code,
    cause: causeMsg,
  };
}

async function probeUrlReachable(url: string): Promise<SupabaseProbeResult> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    const reachable = res.ok || res.status === 401;
    return {
      ok: reachable,
      message: reachable ? "reachable" : `HTTP ${res.status} ${res.statusText}`,
      httpStatus: res.status,
    };
  } catch (error) {
    return fromFetchException(error);
  }
}

async function probeSupabaseClient(
  url: string,
  key: string,
  label: string,
): Promise<SupabaseProbeResult> {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const client = createSupabaseClient(url, key, { auth: { persistSession: false } });
  const { error, count } = await client
    .from("categories")
    .select("id", { count: "exact", head: true });
  if (!error) {
    return { ok: true, message: `${label} client query succeeded`, details: `count=${count ?? 0}` };
  }
  return fromPostgrestError(error);
}

/** Run separate connectivity probes — never logs or returns API keys. */
export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnostics> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const urlHost = parseUrlHost(url);
  const urlIncludesRestV1Path = /\/rest\/v1\/?$/.test(
    (() => {
      try {
        return new URL(rawUrl).pathname;
      } catch {
        return rawUrl;
      }
    })(),
  );

  const urlReachable = url ? await probeUrlReachable(url) : { ok: false, message: "NEXT_PUBLIC_SUPABASE_URL is missing" };

  const anonQuery =
    url && anonKey
      ? await probeSupabaseClient(url, anonKey, "anon")
      : { ok: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing" };

  const serviceRoleQuery =
    url && serviceKey
      ? await probeSupabaseClient(url, serviceKey, "service_role")
      : { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is missing" };

  const categoriesTable =
    url && serviceKey
      ? await probeSupabaseClient(url, serviceKey, "service_role")
      : { ok: false, message: "Cannot probe categories without URL and service role key" };

  const projectPausedOrMissing =
    isProjectMissingSignal(urlReachable.message, urlReachable.details, urlReachable.cause) ||
    isProjectMissingSignal(anonQuery.message, anonQuery.details, anonQuery.cause) ||
    isProjectMissingSignal(serviceRoleQuery.message, serviceRoleQuery.details, serviceRoleQuery.cause) ||
    isProjectMissingSignal(categoriesTable.message, categoriesTable.details, categoriesTable.cause);

  return {
    urlHost,
    anonKeyFormat: detectKeyFormat(anonKey),
    serviceRoleKeyFormat: detectKeyFormat(serviceKey),
    urlIncludesRestV1Path,
    urlReachable,
    anonQuery,
    serviceRoleQuery,
    categoriesTable,
    projectPausedOrMissing,
  };
}

/** Dev-only structured log — no secrets. */
export function logSupabaseDiagnostics(diagnostics: SupabaseDiagnostics) {
  if (process.env.NODE_ENV === "production") return;
  console.error("[supabase/diagnostics]", JSON.stringify(diagnostics, null, 2));
}

/** Summarize the first failing probe for API responses. */
export function summarizeDiagnosticsFailure(diagnostics: SupabaseDiagnostics): string {
  const probes = [
    ["url", diagnostics.urlReachable],
    ["anon", diagnostics.anonQuery],
    ["service_role", diagnostics.serviceRoleQuery],
    ["categories", diagnostics.categoriesTable],
  ] as const;

  for (const [name, probe] of probes) {
    if (!probe.ok) {
      const parts = [`${name}: ${probe.message}`];
      if (probe.cause) parts.push(`cause: ${probe.cause}`);
      if (probe.code) parts.push(`code: ${probe.code}`);
      if (probe.httpStatus) parts.push(`http: ${probe.httpStatus}`);
      if (probe.hint) parts.push(`hint: ${probe.hint}`);
      if (diagnostics.projectPausedOrMissing) {
        parts.push(
          "The Supabase project hostname does not resolve. Confirm NEXT_PUBLIC_SUPABASE_URL matches an active project in the Supabase dashboard (Project Settings → API).",
        );
      }
      return parts.join(" | ");
    }
  }
  return "Unknown Supabase connectivity failure";
}

/** Format a Postgrest / fetch error without masking transport failures. */
export function formatSupabaseError(error: PostgrestError | null): string {
  if (!error) return "Unknown error";
  const cause = extractFetchCause(error.details ?? error.message);
  const parts = [error.message];
  if (cause && !error.message.includes(cause)) parts.push(cause);
  if (error.code) parts.push(`code: ${error.code}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);
  return parts.join(" | ");
}

/** Convenience wrappers used elsewhere */
export async function probeAnonCategories() {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, message: "Supabase client not configured" };
  const { error, count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  if (error) return { ok: false as const, message: formatSupabaseError(error) };
  return { ok: true as const, count: count ?? 0 };
}

export async function probeAdminCategories() {
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, message: "Admin client not configured" };
  const { error, count } = await admin.from("categories").select("id", { count: "exact", head: true });
  if (error) return { ok: false as const, message: formatSupabaseError(error) };
  return { ok: true as const, count: count ?? 0 };
}

export { detectKeyFormat, parseUrlHost };
