import { NextResponse } from "next/server";
import { countVisitorsToday } from "@/lib/arena/visits";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30;

export async function GET() {
  const admin = createAdminClient();
  const visitorsToday = admin ? await countVisitorsToday(admin) : 0;
  return NextResponse.json({ visitorsToday });
}
