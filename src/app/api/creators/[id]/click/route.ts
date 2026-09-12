import { NextResponse } from "next/server";
import { clickCookieName, hasRecentClickCookie, incrementCreatorClick } from "@/lib/arena/clicks";
import { isPublicCreator } from "@/lib/creators/public";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limited = rateLimit(clientKey(request, `click-${id}`), 30);
  if (!limited.ok) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: creator } = await admin
    .from("creators")
    .select("id, status, listing_payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!creator || !isPublicCreator(creator)) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  const already = hasRecentClickCookie(request, id);
  const result = await incrementCreatorClick(admin, id, already);
  const res = NextResponse.json({ ok: true, counted: result.counted });
  if (result.counted && result.maxAge) {
    res.cookies.set(clickCookieName(id), "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: result.maxAge,
      path: "/",
    });
  }
  return res;
}
