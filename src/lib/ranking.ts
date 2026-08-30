export const MIN_RANKING_BID = 199;
export const RANK_INCREMENT = 100;
export const MIN_HYPE = 49;
export const HYPE_PRESETS = [49, 99, 199, 499, 999, 2000] as const;

export function minOvertakeAmount(currentHighestBid: number) {
  if (!currentHighestBid || currentHighestBid <= 0) return MIN_RANKING_BID;
  return currentHighestBid + RANK_INCREMENT;
}

export function validateRankingBid(
  amount: number,
  currentHighestBid: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter a valid ranking bid amount." };
  }

  if ((!currentHighestBid || currentHighestBid <= 0) && amount < MIN_RANKING_BID) {
    return { ok: false, message: "Minimum ranking bid is ₹199." };
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
    return { ok: false, message: "Minimum hype amount is ₹49." };
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

  const failed = cases.filter(([ok]) => !ok);
  if (failed.length) {
    throw new Error(`Ranking self-tests failed: ${failed.map(([, n]) => n).join(", ")}`);
  }
  return true;
}
