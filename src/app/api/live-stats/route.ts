import { NextResponse } from "next/server";
import { getLiveStats } from "@/lib/queries";

export const revalidate = 60;

export async function GET() {
  const stats = await getLiveStats();
  return NextResponse.json(stats);
}
