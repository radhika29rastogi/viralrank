import { NextResponse } from "next/server";
import { fetchInstagramProfile } from "@/lib/instagram/instagramService";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const INVALID_CODES = new Set(["empty", "invalid_username"]);

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "ig-fetch"), 20);
  if (!limited.ok) {
    return NextResponse.json(
      {
        available: false,
        code: "rate_limit",
        message: "Too many requests. Wait a moment, or enter details manually.",
      },
      { status: 429 },
    );
  }

  let json: { input?: string } = {};
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { available: false, code: "invalid_username", message: "Invalid request." },
      { status: 400 },
    );
  }

  const result = await fetchInstagramProfile(typeof json.input === "string" ? json.input : "");

  if (!result.available) {
    const status = INVALID_CODES.has(result.code) ? 400 : 200;
    return NextResponse.json(
      {
        available: false,
        code: result.code,
        message: result.message,
        username: result.username,
        url: result.url,
        ...(result.reason ? { reason: result.reason } : {}),
      },
      { status },
    );
  }

  return NextResponse.json({
    available: true,
    username: result.profile.username,
    url: result.profile.url,
    name: result.profile.name,
    bio: result.profile.bio,
    profileImageUrl: result.profile.profileImageUrl,
    followers: result.metrics.followers,
    averageViews: result.metrics.averageViews,
    missingFields: result.missingFields,
    source: "instagram",
  });
}
