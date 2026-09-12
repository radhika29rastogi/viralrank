import { NextResponse } from "next/server";
import { clickCookieName, hasRecentClickCookie, incrementCreatorClick } from "@/lib/arena/clicks";
import { isPublicCreator } from "@/lib/creators/public";
import { isAllowedInstagramUrl } from "@/lib/security";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: creatorId } = await params;
  const limited = rateLimit(clientKey(request, `instagram-${creatorId}`), 60);
  if (!limited.ok) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data: creator } = await admin
    .from("creators")
    .select("instagram_url, status, listing_payment_status")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator || !isPublicCreator(creator) || !creator.instagram_url) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAllowedInstagramUrl(creator.instagram_url)) {
    console.error("[instagram-redirect] blocked non-instagram url", creatorId);
    return NextResponse.redirect(new URL("/", request.url));
  }

  const already = hasRecentClickCookie(request, creatorId);
  const result = await incrementCreatorClick(admin, creatorId, already);
  const res = NextResponse.redirect(creator.instagram_url);
  if (result.counted && result.maxAge) {
    res.cookies.set(clickCookieName(creatorId), "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: result.maxAge,
      path: "/",
    });
  }
  return res;
}
