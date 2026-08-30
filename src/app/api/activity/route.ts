import { NextResponse } from "next/server";
import { getArenaFeed } from "@/lib/queries";

export async function GET() {
  const events = await getArenaFeed(24);
  return NextResponse.json({ events });
}
