import { NextResponse } from "next/server";
import { getListedCreator, listedCreatorToSnapshot } from "@/lib/arena/listed";
import { lookupInstagramProfile } from "@/lib/instagram/fetch-profile";
import { parseInstagramProfileInput } from "@/lib/instagram/username";
import { INSTAGRAM_LOOKUP_MESSAGES } from "@/lib/instagram/types";
import { clientKey, rateLimit } from "@/lib/rate-limit";

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
    return NextResponse.json({
      profile: listedCreatorToSnapshot(listedRow),
      cached: true,
      listed: true,
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
  });
}
