import { MIN_HYPE_AMOUNT, MIN_RANKING_BID } from "@/lib/ranking";

export const FAQ_ITEMS = [
  {
    q: "What is ViralRank?",
    a: "ViralRank.buzz is a paid creator ranking arena. Paste an Instagram handle — no signup — we fetch the real profile, then you hype or bid. Hype adds directly to a creator's score. Ranking bids and hype both count toward rank.",
  },
  {
    q: "What is the minimum to rank a creator on ViralRank?",
    a: `The first rank bid on a new creator is ₹${MIN_RANKING_BID.toLocaleString("en-IN")}. Hype starts at ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")} and can be sent any number of times.`,
  },
  {
    q: "How is the #1 spot decided on ViralRank?",
    a: "A creator's overall rank is decided by their combined score — their highest verified rank bid plus their total verified hype. Highest combined score holds the higher rank. If two creators have an equal combined score, whichever reached that score first holds the higher position.",
  },
  {
    q: "How does the ranking work?",
    a: `Combined score is highest verified rank bid + all verified hype. First bid is ₹${MIN_RANKING_BID.toLocaleString("en-IN")}. Every new bid on that creator must be at least the current highest bid + ₹100. Coupons discount what you pay, not the ranked amount.`,
  },
  {
    q: "How much does it cost to submit?",
    a: `The minimum ranking bid is ₹${MIN_RANKING_BID.toLocaleString("en-IN")}. Hype starts at ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")}. You can type any amount at or above the required minimum.`,
  },
  {
    q: "How does Hype work?",
    a: `Hype is ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")} minimum, any amount above, unlimited times. Hype adds directly to a creator's combined score alongside their ranking bid — it changes rank.`,
  },
  {
    q: "What is the daily battle?",
    a: "Every day at 8:00 PM IST, the live #1 vs #2 pairing is scored by hype received that day. If neither received hype, the winner is decided by profile visits and Instagram click-throughs.",
  },
  {
    q: "Can I submit memes and videos?",
    a: "Yes. ViralRank supports many Instagram content categories — memes, videos, music, dance, devotional, motivation, comedy, lifestyle, gaming, tech, and more.",
  },
  {
    q: "Do I need followers to rank?",
    a: "No. ViralRank is designed around paid rank bids and verified hype, not follower count.",
  },
] as const;
