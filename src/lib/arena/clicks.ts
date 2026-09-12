import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 60 * 60 * 1000;

export function clickCookieName(creatorId: string) {
  return `vr_click_${creatorId.slice(0, 8)}`;
}

export async function incrementCreatorClick(
  admin: SupabaseClient,
  creatorId: string,
  alreadyCounted: boolean,
) {
  if (alreadyCounted) return { counted: false };
  const { error } = await admin.rpc("increment_instagram_clicks", { p_creator_id: creatorId });
  if (error) {
    const { data } = await admin
      .from("creators")
      .select("profile_clicks, instagram_clicks")
      .eq("id", creatorId)
      .maybeSingle();
    await admin
      .from("creators")
      .update({
        profile_clicks: Number(data?.profile_clicks || 0) + 1,
        instagram_clicks: Number(data?.instagram_clicks || 0) + 1,
      })
      .eq("id", creatorId);
  }
  return { counted: true, maxAge: Math.floor(WINDOW_MS / 1000) };
}

export function hasRecentClickCookie(request: NextRequest | Request, creatorId: string) {
  const header = request.headers.get("cookie") ?? "";
  return header.includes(`${clickCookieName(creatorId)}=`);
}
