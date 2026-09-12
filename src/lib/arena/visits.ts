import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfTodayIst } from "@/lib/arena/time";

export async function recordVisit(
  admin: SupabaseClient,
  sessionHash: string,
  path: string,
) {
  const since = startOfTodayIst().toISOString();
  const { data } = await admin
    .from("visits")
    .select("id")
    .eq("session_hash", sessionHash)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (data?.id) return { recorded: false };
  const { error } = await admin.from("visits").insert({
    session_hash: sessionHash,
    path: path.slice(0, 200),
  });
  if (error) {
    console.error("[visits] insert failed", error.message);
    return { recorded: false };
  }
  return { recorded: true };
}

export async function countVisitorsToday(admin: SupabaseClient) {
  const since = startOfTodayIst().toISOString();
  const { count, error } = await admin
    .from("visits")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) {
    console.error("[visits] count failed", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function countVerifiedPayments(admin: SupabaseClient) {
  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "verified");
  return count ?? 0;
}
