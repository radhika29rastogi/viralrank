import { NextResponse } from "next/server";
import { getInstagramConfigStatus } from "@/lib/instagram/instagramService";

export const runtime = "nodejs";

/**
 * Safe configuration probe for local/dev. Never returns tokens or secrets.
 */
export async function GET() {
  const status = getInstagramConfigStatus();
  return NextResponse.json({
    configured: status.configured,
    hasAccessToken: status.hasAccessToken,
    hasBusinessAccountId: status.hasBusinessAccountId,
    hasClientSecret: status.hasClientSecret,
    apiVersion: status.apiVersion,
    apiHost: status.apiHost,
    api: status.api,
    missing: status.missing,
  });
}
