import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { ensureCategoriesSeeded, resolveCategoryId } from "@/lib/supabase/seed-categories";
import { createClient } from "@/lib/supabase/server";
import { submitCreatorSchema } from "@/lib/validation/schemas";
import { instagramUrlFromUsername, normalizeInstagramUsername } from "@/lib/format";
import { isPublicCreator } from "@/lib/creators/public";
import { getCreators } from "@/lib/queries";
import {
  listingPaymentSchemaErrorMessage,
  LISTING_PAYMENT_MIGRATION,
  probeListingPaymentSchema,
} from "@/lib/supabase/schema-readiness";
import { isOwnStorageImageUrl, publicErrorBody } from "@/lib/security";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";

async function verifyTurnstile(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // If Turnstile is not configured, allow submissions.
  if (!secret || !siteKey) return true;
  // If configured, a token is required — never bypass.
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
    const sortParam = searchParams.get("sort");
    const sort =
      sortParam === "bid" ||
      sortParam === "hype" ||
      sortParam === "clicks" ||
      sortParam === "followers" ||
      sortParam === "newest" ||
      sortParam === "trending"
        ? sortParam
        : "trending";
    const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit")) || 12));
    const { items, total } = await getCreators({
      sort,
      limit,
      search: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
    });
    return NextResponse.json({
      total,
      items: items.map((creator) => ({
        id: creator.id,
        instagram_username: creator.instagram_username,
        name: creator.name,
        profile_image_url: creator.profile_image_url,
        category: creator.categories?.name ?? null,
        current_rank: creator.current_rank,
        hype_count: creator.hype_count,
        profile_clicks: creator.profile_clicks,
      })),
    });
  }

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  if (!supabase) {
    return NextResponse.json({ creator: null });
  }

  const normalized = normalizeInstagramUsername(username);
  const { data } = await supabase
    .from("creators")
    .select("id, instagram_username, current_highest_bid, current_rank, status, listing_payment_status")
    .eq("instagram_username", normalized)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ creator: null });
  }

  if (isPublicCreator(data)) {
    return NextResponse.json({
      creator: {
        id: data.id,
        instagram_username: data.instagram_username,
        current_highest_bid: data.current_highest_bid,
        current_rank: data.current_rank,
      },
    });
  }

  // Do not leak pending creator IDs publicly
  return NextResponse.json({
    creator: null,
    pending: true,
  });
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

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to submit a creator.", code: "auth_required" },
      { status: 401 },
    );
  }

  const username = normalizeInstagramUsername(input.instagramUsername);
  const { data: existing } = await admin
    .from("creators")
    .select("id, instagram_username, status, listing_payment_status, user_id")
    .eq("instagram_username", username)
    .maybeSingle();

  if (existing) {
    if (isPublicCreator(existing)) {
      return NextResponse.json(
        { error: "exists", username: existing.instagram_username },
        { status: 409 },
      );
    }
    if (existing.user_id && existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "exists", username: existing.instagram_username },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "pending_payment",
        username: existing.instagram_username,
        creatorId: existing.id,
      },
      { status: 409 },
    );
  }

  const seed = await ensureCategoriesSeeded(admin);
  if (!seed.ok) {
    return NextResponse.json(
      { error: "Creator submissions are not ready. Contact support if this continues." },
      { status: seed.reason === "missing_table" ? 503 : 500 },
    );
  }

  const schema = await probeListingPaymentSchema(admin);
  if (!schema.ready) {
    const message = listingPaymentSchemaErrorMessage(schema);
    console.error("[creators/post] listing payment schema not ready", {
      table: schema.table,
      missingColumns: schema.missingColumns,
      migration: LISTING_PAYMENT_MIGRATION,
      supabase: schema.error,
    });
    return NextResponse.json(
      publicErrorBody(message, {
        code: "missing_migration",
        migration: LISTING_PAYMENT_MIGRATION,
        table: schema.table,
        missingColumns: schema.missingColumns,
        supabase: schema.error,
      }),
      { status: 503 },
    );
  }

  const resolved = await resolveCategoryId(admin, input.categoryId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const categoryId = resolved.id;

  let profileImageUrl = input.profileImageUrl || null;
  if (profileImageUrl) {
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
      : undefined;
    if (!isOwnStorageImageUrl(profileImageUrl, supabaseHost)) {
      return NextResponse.json(
        { error: "Profile image must be uploaded through ViralRank." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await admin
    .from("creators")
    .insert({
      user_id: user.id,
      instagram_username: username,
      instagram_url: input.instagramUrl || instagramUrlFromUsername(username),
      name: input.name,
      bio: input.bio || null,
      profile_image_url: profileImageUrl,
      category_id: categoryId,
      location: input.location,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      followers: Number.isFinite(input.followers) ? input.followers : null,
      average_views: Number.isFinite(input.averageViews) ? input.averageViews : null,
      instagram_data_source: "creator_provided",
      status: "pending_payment",
      listing_payment_status: "pending",
    })
    .select("id, instagram_username")
    .single();

  if (error) {
    const failedColumn = error.message.match(/'([^']+)'\s+column/i)?.[1];
    console.error("[creators/post] insert failed", {
      table: "creators",
      failedColumn,
      status: error.code,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload: {
        status: "pending_payment",
        listing_payment_status: "pending",
        category_id: categoryId,
        instagram_username: username,
      },
    });
    if (error.code === "23505") {
      return NextResponse.json({ error: "exists", username }, { status: 409 });
    }
    if (error.code === "23503") {
      return NextResponse.json({ error: "Please select a valid category." }, { status: 400 });
    }
    if (error.code === "23514") {
      return NextResponse.json(
        publicErrorBody("Creator submissions are not ready. Contact support if this continues.", {
          code: "missing_migration",
          migration: LISTING_PAYMENT_MIGRATION,
          supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint },
        }),
        { status: 503 },
      );
    }
    if (error.code === "PGRST204") {
      return NextResponse.json(
        publicErrorBody("Creator submissions are not ready. Contact support if this continues.", {
          code: "missing_migration",
          migration: LISTING_PAYMENT_MIGRATION,
          table: "creators",
          failedColumn,
          supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint },
        }),
        { status: 503 },
      );
    }
    return NextResponse.json(
      publicErrorBody("Could not save this creator.", {
        code: "insert_failed",
        supabase: { code: error.code, message: error.message, details: error.details, hint: error.hint },
      }),
      { status: 500 },
    );
  }

  return NextResponse.json({
    creatorId: data.id,
    username: data.instagram_username,
    requiresPayment: true,
    amount: 199,
  });
}

