import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionHash } from "@/lib/arena/tokens";
import { recordVisit } from "@/lib/arena/visits";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE = "vr_session";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "visit"), 30);
  if (!limited.ok) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  const jar = await cookies();
  let session = jar.get(COOKIE)?.value;
  const fresh = !session;
  if (!session) session = createSessionHash();

  let path = "/";
  try {
    const json = (await request.json()) as { path?: string };
    if (json.path?.startsWith("/")) path = json.path;
  } catch {
    path = "/";
  }

  await recordVisit(admin, session, path);

  const res = NextResponse.json({ ok: true });
  if (fresh) {
    res.cookies.set(COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
