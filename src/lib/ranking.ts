export const MIN_RANKING_BID = 199;
export const RANK_INCREMENT = 100;
export const MIN_HYPE_AMOUNT = 49;
export const MIN_HYPE = MIN_HYPE_AMOUNT;
/** Discounted ranking-bid charge cannot fall below the hype floor. */
export const MIN_COUPON_CHARGE = MIN_HYPE_AMOUNT;
export const HYPE_PRESETS = [49, 99, 199, 499, 999, 2000] as const;
export const COUPON_RANK_BID_ONLY = "Coupons can only be applied to ranking bids.";

export const HYPE_RANK_COPY =
  "Hype adds directly to a creator's score. Ranking bids and hype both count toward rank.";

/**
 * combined_score = current_highest_bid + total_hype_amount (generated in Postgres).
 * Only verified/paid bid_amount values. Never amount_charged.
 * Live rank is RANK() over combined_score DESC, score_reached_at ASC — query time, not a stored column.
 */
export function rankingScore(highestBid: number, verifiedHypeTotal: number) {
  return Math.max(0, Math.round(highestBid || 0) + Math.round(verifiedHypeTotal || 0));
}

export function minOvertakeAmount(currentHighestBid: number) {
  if (!currentHighestBid || currentHighestBid <= 0) return MIN_RANKING_BID;
  return currentHighestBid + RANK_INCREMENT;
}

/**
 * Bid amount that would put this creator's combined score strictly above the rival.
 * A first listing (no current bid) is always MIN_RANKING_BID — never rival score + 1.
 */
export function bidNeededForRank(
  currentHighestBid: number,
  totalHypeAmount: number,
  rivalCombinedScore: number,
) {
  if (!currentHighestBid || currentHighestBid <= 0) return MIN_RANKING_BID;
  const minBid = minOvertakeAmount(currentHighestBid);
  const bidToBeatRival = Math.round(rivalCombinedScore || 0) - Math.round(totalHypeAmount || 0) + 1;
  return Math.max(minBid, bidToBeatRival, MIN_RANKING_BID);
}

export function validateRankingBid(
  amount: number,
  currentHighestBid: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter a valid ranking bid amount." };
  }

  if ((!currentHighestBid || currentHighestBid <= 0) && amount < MIN_RANKING_BID) {
    return { ok: false, message: `Minimum ranking bid is ₹${MIN_RANKING_BID.toLocaleString("en-IN")}.` };
  }

  const min = minOvertakeAmount(currentHighestBid);
  if (currentHighestBid > 0 && amount < min) {
    return {
      ok: false,
      message: `Your bid must be at least ₹${min} to take this rank.`,
    };
  }

  return { ok: true };
}

export function validateHypeAmount(
  amount: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount < MIN_HYPE) {
    return { ok: false, message: `Minimum hype amount is ₹${MIN_HYPE_AMOUNT.toLocaleString("en-IN")}.` };
  }
  return { ok: true };
}

export function runRankingSelfTests() {
  const cases: Array<[boolean, string]> = [];

  const firstLow = validateRankingBid(198, 0);
  cases.push([!firstLow.ok && firstLow.message.includes("₹199"), "first bid below min"]);

  const firstOk = validateRankingBid(199, 0);
  cases.push([firstOk.ok, "first bid at min"]);

  const overtakeLow = validateRankingBid(298, 199);
  cases.push([
    !overtakeLow.ok && overtakeLow.message.includes("₹299"),
    "overtake below increment",
  ]);

  const overtakeOk = validateRankingBid(299, 199);
  cases.push([overtakeOk.ok, "overtake at increment"]);

  const hypeLow = validateHypeAmount(48);
  cases.push([!hypeLow.ok && hypeLow.message.includes("₹49"), "hype below min"]);

  const hypeOk = validateHypeAmount(10000);
  cases.push([hypeOk.ok, "large hype still valid as hype"]);

  cases.push([rankingScore(199, 100) === 299, "score bid plus hype"]);
  cases.push([rankingScore(249, 0) === 249, "score bid only"]);
  cases.push([rankingScore(199, 100) > rankingScore(249, 0), "hype can outrank a higher bid"]);

  cases.push([bidNeededForRank(0, 0, 199) === MIN_RANKING_BID, "first bid floor is 199, not rival+1"]);
  cases.push([bidNeededForRank(199, 0, 199) === 299, "hold #1 uses increment floor"]);
  cases.push([bidNeededForRank(199, 100, 350) === 299, "hype already close, increment still binds"]);
  cases.push([bidNeededForRank(199, 0, 1000) === 1001, "far rival needs bid above rival minus hype"]);
  cases.push([bidNeededForRank(500, 0, 550) === 600, "increment floor beats small score gap"]);

  const failed = cases.filter(([ok]) => !ok);
  if (failed.length) {
    throw new Error(`Ranking self-tests failed: ${failed.map(([, n]) => n).join(", ")}`);
  }
  return true;
}
