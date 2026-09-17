import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/format";

export const dynamic = "force-static";

export function GET() {
  const origin = siteUrl();
  const body = `# ViralRank.buzz

> ViralRank is a paid Instagram creator ranking arena. No signup. Paste a handle, pay with Razorpay, and the listing goes live only after server webhook verification.

## Core mechanics
- Ranking bid: first listing ₹199. To overtake a listed creator's bid floor, pay current highest verified bid + ₹100.
- Hype: ₹49 minimum, unlimited times. Hype adds directly to a creator's score. Ranking bids and hype both count toward rank.
- combined_score = highest verified rank bid + total verified hype. Ties go to whoever reached that total first.
- Coupons discount the Razorpay charge, not the ranked amount.
- Daily battle: at 8:00 PM IST the live #1 vs #2 pair is scored by hype that day, then visits/engagement if neither received hype. This does not change main rank.

## Key pages
- ${origin}/
- ${origin}/rankings
- ${origin}/explore
- ${origin}/submit
- ${origin}/rules
- ${origin}/about
`;
  return new NextResponse(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
