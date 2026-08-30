import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ creatorId: z.string().uuid() });

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid creator." }, { status: 400 });
  }

  const creatorId = parsed.data.creatorId;
  const cookieStore = await cookies();
  const raw = cookieStore.get("vr_clicks")?.value;
  let seen: Record<string, number> = {};
  try {
    seen = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    seen = {};
  }

  const last = seen[creatorId] ?? 0;
  const windowMs = 6 * 60 * 60 * 1000;
  if (Date.now() - last < windowMs) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: creator } = await admin
        .from("creators")
        .select("user_id")
        .eq("id", creatorId)
        .maybeSingle();
      if (creator?.user_id && creator.user_id === user.id) {
        return NextResponse.json({ ok: true, counted: false });
      }
    }
  }

  await admin.rpc("increment_profile_clicks", { p_creator_id: creatorId });
  seen[creatorId] = Date.now();

  const response = NextResponse.json({ ok: true, counted: true });
  response.cookies.set("vr_clicks", JSON.stringify(seen), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
