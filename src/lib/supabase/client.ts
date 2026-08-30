import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(normalizeSupabaseUrl(url), key);
}
