import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { ensureCategoriesSeeded, resolveCategoryId } from "@/lib/supabase/seed-categories";
import { createClient } from "@/lib/supabase/server";
import { submitCreatorSchema } from "@/lib/validation/schemas";
import { matchFetchedProfile } from "@/lib/instagram/instagramService";
import { instagramUrlFromUsername, normalizeInstagramUsername } from "@/lib/format";

async function verifyTurnstile(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const json = (await res.json()) as { success?: boolean };
  return Boolean(json.success);
}

export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "creators-get"), 60);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  if (!supabase) {
    return NextResponse.json({ creator: null });
  }

  const { data } = await supabase
    .from("creators")
    .select("id, instagram_username, current_highest_bid, current_rank")
    .eq("instagram_username", normalizeInstagramUsername(username))
    .maybeSingle();

  return NextResponse.json({ creator: data });
}

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "creators-post"), 8);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    const db = getSupabaseConfigStatus();
    return NextResponse.json(
      {
        error:
          "Creator submissions are not configured yet. Add Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) to the server environment.",
        code: "missing_config",
        missing: db.missing.filter(
          (k) => k === "NEXT_PUBLIC_SUPABASE_URL" || k === "SUPABASE_SERVICE_ROLE_KEY",
        ),
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = submitCreatorSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const input = parsed.data;
  if (input.website) {
    return NextResponse.json({ error: "Submission rejected." }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(input.turnstileToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA failed. Please try again." }, { status: 400 });
  }

  const username = normalizeInstagramUsername(input.instagramUsername);
  const { data: existing } = await admin
    .from("creators")
    .select("instagram_username")
    .eq("instagram_username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "exists", username: existing.instagram_username },
      { status: 409 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const seed = await ensureCategoriesSeeded(admin);
  if (!seed.ok) {
    return NextResponse.json({ error: seed.message }, { status: seed.reason === "missing_table" ? 503 : 500 });
  }

  const resolved = await resolveCategoryId(admin, input.categoryId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const categoryId = resolved.id;

  const { data, error } = await admin
    .from("creators")
    .insert({
      user_id: user?.id ?? null,
      instagram_username: username,
      instagram_url: input.instagramUrl || instagramUrlFromUsername(username),
      name: input.name,
      bio: input.bio || null,
      profile_image_url: input.profileImageUrl || null,
      category_id: categoryId,
      location: input.location,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      followers: Number.isFinite(input.followers) ? input.followers : null,
      average_views: Number.isFinite(input.averageViews) ? input.averageViews : null,
      instagram_data_source: matchFetchedProfile({
        username,
        followers: Number.isFinite(input.followers) ? input.followers : null,
        averageViews: Number.isFinite(input.averageViews) ? input.averageViews : null,
      })
        ? "instagram"
        : "creator_provided",
      status: "approved",
    })
    .select("instagram_username")
    .single();

  if (error) {
    console.error("[creators/post] insert failed", { code: error.code, message: error.message });
    if (error.code === "23505") {
      return NextResponse.json({ error: "exists", username }, { status: 409 });
    }
    if (error.code === "23503") {
      return NextResponse.json({ error: "Please select a valid category." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not save this creator." }, { status: 500 });
  }

  return NextResponse.json({ username: data.instagram_username });
}

