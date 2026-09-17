import { NextResponse } from "next/server";
import { getListedCreator, listedCreatorToSnapshot } from "@/lib/arena/listed";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { parseInstagramProfileInput } from "@/lib/instagram/username";
import { INSTAGRAM_LOOKUP_MESSAGES } from "@/lib/instagram/types";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getCreatorByUsername, getTopTwo } from "@/lib/queries";
import { rankingScore } from "@/lib/ranking";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "ig-lookup"), 8);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limit", message: INSTAGRAM_LOOKUP_MESSAGES.rate_limit },
      { status: 429 },
    );
  }

  let json: { handle?: string };
  try {
    json = (await request.json()) as { handle?: string };
  } catch {
    return NextResponse.json({ error: "invalid", message: "Invalid request." }, { status: 400 });
  }

  const parsed = parseInstagramProfileInput(json.handle ?? "");
  const listedRow = parsed.ok ? await getListedCreator(parsed.username) : null;
  if (listedRow) {
    const ranked = await getCreatorByUsername(listedRow.instagram_username);
    const hype = Number(ranked?.total_hype_amount ?? listedRow.total_hype_amount ?? 0);
    const combined = Number(
      ranked?.combined_score ??
        listedRow.combined_score ??
        rankingScore(Number(listedRow.current_highest_bid || 0), hype),
    );
    return NextResponse.json({
      profile: listedCreatorToSnapshot(listedRow),
      cached: true,
      listed: true,
      current_highest_bid: Number(listedRow.current_highest_bid || 0),
      total_hype_amount: hype,
      combined_score: combined,
      live_rank: ranked?.current_rank ?? null,
      target_rank: ranked?.target_rank ?? 1,
      rival_combined_score: ranked?.rival_combined_score ?? combined,
    });
  }

  const result = await lookupInstagramProfile(json.handle ?? "");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    profile: result.profile,
    cached: result.cached,
    listed: false,
    current_highest_bid: 0,
    total_hype_amount: 0,
    combined_score: 0,
    live_rank: null,
    target_rank: 1,
    rival_combined_score: Number((await getTopTwo())[0]?.combined_score ?? 0),
  });
}
