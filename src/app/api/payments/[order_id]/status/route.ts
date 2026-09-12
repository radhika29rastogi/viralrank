import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ order_id: string }> },
) {
  const { order_id: orderId } = await params;
  if (!orderId?.startsWith("order_")) {
    return NextResponse.json({ status: "unknown" });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "unknown" });

  const { data } = await admin
    .from("payments")
    .select("status, took_rank, instagram_handle, edit_token, type, amount_inr")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (!data) return NextResponse.json({ status: "unknown" });

  if (data.status === "verified") {
    return NextResponse.json({
      status: "verified",
      took_rank: data.took_rank,
      handle: data.instagram_handle,
      type: data.type,
      amount_inr: data.amount_inr,
      manage_token: data.edit_token,
    });
  }
  if (data.status === "failed") return NextResponse.json({ status: "failed" });
  return NextResponse.json({ status: "pending" });
}
