"use client";

import { useMemo, useState } from "react";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { StandardCheckoutButton } from "@/components/payments/StandardCheckoutButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_DISCLAIMER } from "@/lib/copy/platform";
import { MIN_STANDARD_ORDER_PAISE } from "@/lib/razorpay/constants";

export default function CheckoutPage() {
  const [rupees, setRupees] = useState(1);
  const amountPaise = useMemo(() => Math.round(rupees * 100), [rupees]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md" accent="Checkout">
        Standard Checkout
      </DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Razorpay Standard Web Checkout. The server creates an order, this page opens the payment
          modal, then the signature is verified with HMAC-SHA256. Product listing and hype payments
          still use their own flows.
        </p>
        <div>
          <Label htmlFor="checkout-amount">Amount (₹)</Label>
          <Input
            id="checkout-amount"
            type="number"
            min={MIN_STANDARD_ORDER_PAISE / 100}
            step="1"
            value={rupees}
            onChange={(e) => setRupees(Number(e.target.value))}
          />
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Sent to Razorpay as {amountPaise} paise. Minimum ₹1 (100 paise).
          </p>
        </div>
        <StandardCheckoutButton
          amountPaise={amountPaise}
          description="ViralRank Standard Checkout"
        />
        <p className="text-xs text-muted-foreground">{PAYMENT_DISCLAIMER}</p>
      </ColorBlock>
    </div>
  );
}
