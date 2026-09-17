import { runRankingSelfTests } from "./ranking";
import { chargeAfterDiscount, isRankBidPaymentType } from "./arena/coupons";
import { MIN_COUPON_CHARGE, MIN_RANKING_BID } from "./ranking";

runRankingSelfTests();

if (chargeAfterDiscount(MIN_RANKING_BID, 50) !== 149) {
  throw new Error("WELCOME50 on ₹199 should charge ₹149");
}
if (chargeAfterDiscount(MIN_RANKING_BID, 500) !== MIN_COUPON_CHARGE) {
  throw new Error("discounted bid charge cannot fall below hype floor");
}
if (isRankBidPaymentType("hype")) {
  throw new Error("hype is not a rank bid payment type");
}
if (!isRankBidPaymentType("ranking_bid") || !isRankBidPaymentType("rank_bid")) {
  throw new Error("rank bid aliases must be accepted");
}

console.log("ranking self-tests passed");
