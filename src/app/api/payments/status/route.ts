import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pendingId = searchParams.get("pendingId");
  const kind = searchParams.get("kind");
  if (!pendingId || (kind !== "ranking_bid" && kind !== "hype" && kind !== "listing_payment")) {
    return NextResponse.json({ status: "unknown" });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "unknown" });

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (kind === "listing_payment") {
    if (!user) return NextResponse.json({ status: "unknown" }, { status: 401 });

    const { data } = await admin
      .from("creator_listing_payments")
      .select("is_verified, payment_status, creator_id")
      .eq("id", pendingId)
      .maybeSingle();
    if (!data) return NextResponse.json({ status: "unknown" });

    const { data: creator } = await admin
      .from("creators")
      .select("instagram_username, status, listing_payment_status, user_id")
      .eq("id", data.creator_id)
      .maybeSingle();

    if (!creator?.user_id || creator.user_id !== user.id) {
      return NextResponse.json({ status: "unknown" }, { status: 403 });
    }

    if (data.is_verified) {
      return NextResponse.json({
        status: "verified",
        username: creator.instagram_username,
        published: creator.status === "active" && creator.listing_payment_status === "paid",
      });
    }
    if (data.payment_status === "failed") return NextResponse.json({ status: "failed" });
    return NextResponse.json({ status: "pending" });
  }

  const table = kind === "ranking_bid" ? "creator_ranking_bids" : "creator_hypes";
  const { data } = await admin
    .from(table)
    .select("is_verified, payment_status, applied_to_rank")
    .eq("id", pendingId)
    .maybeSingle();

  if (!data) return NextResponse.json({ status: "unknown" });

  // Allow poll without auth for supporter flows (email in body not available);
  // only return coarse status — no PII.
  if (data.is_verified && (kind === "hype" || data.applied_to_rank)) {
    return NextResponse.json({ status: "verified" });
  }
  if (data.is_verified && kind === "ranking_bid" && data.applied_to_rank === false) {
    return NextResponse.json({ status: "not_applied" });
  }
  if (data.payment_status === "failed") return NextResponse.json({ status: "failed" });
  return NextResponse.json({ status: "pending" });
}
