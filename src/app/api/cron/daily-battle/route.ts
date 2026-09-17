import { NextResponse } from "next/server";
import { settleDailyBattle } from "@/lib/arena/battle";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function run() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const result = await settleDailyBattle(admin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  const { error: cacheError } = await admin.rpc("refresh_cached_current_rank");
  if (cacheError) {
    console.error("[cron/daily-battle] rank cache refresh failed", cacheError.message);
  }
  return NextResponse.json({
    ok: true,
    skipped: result.skipped ?? null,
    battle_date: result.result?.battle_date ?? null,
    winner_id: result.result?.winner_id ?? null,
    decided_by: result.result?.decided_by ?? null,
  });
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return run();
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return run();
}
