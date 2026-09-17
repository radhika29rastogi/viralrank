import { siteUrl } from "@/lib/format";

export async function sendManageReceipt(input: {
  to: string;
  handle: string;
  token: string;
  type: "rank_bid" | "hype";
  amountInr: number;
  bidAmount?: number;
  tookRank: boolean | null;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "ViralRank <receipts@viralrank.buzz>";
  const manageUrl = `${siteUrl()}/manage/${input.token}`;
  const subject =
    input.type === "rank_bid"
      ? `ViralRank receipt — @${input.handle} rank bid ₹${input.bidAmount ?? input.amountInr}`
      : `ViralRank receipt — @${input.handle} hype ₹${input.bidAmount ?? input.amountInr}`;
  const rankNote =
    input.type === "rank_bid"
      ? input.tookRank
        ? "This bid currently holds the rank."
        : "This payment is verified. Rank bids are non-refundable even if another bid landed first or this amount is no longer enough for #1."
      : "Hype adds directly to this creator's score. Ranking bids and hype both count toward rank.";

  if (!key) {
    console.info("[arena/email] skipped (RESEND_API_KEY unset)", { handle: input.handle });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text: [
          `Thanks for paying ₹${input.amountInr} on ViralRank for @${input.handle}.`,
          input.bidAmount && input.bidAmount !== input.amountInr
            ? `Ranked amount ₹${input.bidAmount}. Charged ₹${input.amountInr}.`
            : "",
          rankNote,
          `Manage this listing (unguessable link — do not share): ${manageUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      }),
    });
    if (!res.ok) {
      console.error("[arena/email] resend failed", res.status);
    }
  } catch (err) {
    console.error("[arena/email] send failed", err instanceof Error ? err.message : err);
  }
}
