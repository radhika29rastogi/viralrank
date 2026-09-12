import { siteUrl } from "@/lib/format";

export async function sendManageReceipt(input: {
  to: string;
  handle: string;
  token: string;
  type: "rank_bid" | "hype";
  amountInr: number;
  tookRank: boolean | null;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "ViralRank <receipts@viralrank.buzz>";
  const manageUrl = `${siteUrl()}/manage/${input.token}`;
  const subject =
    input.type === "rank_bid"
      ? `ViralRank receipt — @${input.handle} rank bid ₹${input.amountInr}`
      : `ViralRank receipt — @${input.handle} hype ₹${input.amountInr}`;
  const rankNote =
    input.type === "rank_bid"
      ? input.tookRank
        ? "This bid currently holds the rank."
        : "This payment is verified. Rank bids are non-refundable even if another bid landed first or this amount is no longer enough for #1."
      : "Hype is a support counter and never changes rank.";

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
          rankNote,
          `Manage this listing (unguessable link — do not share): ${manageUrl}`,
        ].join("\n\n"),
      }),
    });
    if (!res.ok) {
      console.error("[arena/email] resend failed", res.status);
    }
  } catch (err) {
    console.error("[arena/email] send failed", err instanceof Error ? err.message : err);
  }
}
