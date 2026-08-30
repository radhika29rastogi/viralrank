import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pendingId = searchParams.get("pendingId");
  const kind = searchParams.get("kind");
  if (!pendingId || (kind !== "ranking_bid" && kind !== "hype")) {
    return NextResponse.json({ status: "unknown" });
  }

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  if (!supabase) return NextResponse.json({ status: "unknown" });

  const table = kind === "ranking_bid" ? "creator_ranking_bids" : "creator_hypes";
  const { data } = await supabase
    .from(table)
    .select("is_verified, payment_status, applied_to_rank")
    .eq("id", pendingId)
    .maybeSingle();

  if (!data) return NextResponse.json({ status: "unknown" });
  if (data.is_verified && (kind === "hype" || data.applied_to_rank)) {
    return NextResponse.json({ status: "verified" });
  }
  if (data.is_verified && kind === "ranking_bid" && data.applied_to_rank === false) {
    return NextResponse.json({ status: "not_applied" });
  }
  if (data.payment_status === "failed") return NextResponse.json({ status: "failed" });
  return NextResponse.json({ status: "pending" });
}
