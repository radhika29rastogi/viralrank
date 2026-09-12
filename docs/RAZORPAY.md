# Razorpay Standard Checkout

ViralRank uses [Razorpay Standard Web Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/). Orders and signatures are created and verified on the server. `RAZORPAY_KEY_SECRET` never ships to the browser.

## Environment

Set these in `.env` or `.env.local` (both are gitignored). Next.js prefers `.env.local`.

| Variable | Where | Notes |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | Server | Matching Key ID from the Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | Server only | Never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Browser | **Must equal** `RAZORPAY_KEY_ID` |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Required in production for `/api/webhooks/razorpay` |

## Standard Checkout (generic)

Used by `/checkout` and `StandardCheckoutButton`.

1. `POST /api/create-order` with `{ amount }` in **paise** (min 100), optional `currency` and `receipt`.
2. Response: `{ order_id, amount, currency, key_id }`.
3. Browser loads `https://checkout.razorpay.com/v1/checkout.js` and opens the modal with `order_id`.
4. On success, send `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `POST /api/verify-payment`.
5. Server checks `HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)` with timing-safe compare. Mismatch returns **400** and does **not** mark anything paid.

Auth failures from Razorpay order create return **401**. Other Razorpay API errors return **500**.

## Product flows

- **Arena (no auth):** `/submit` → `POST /api/orders` `{ instagram_handle, type, amount, category }` → Razorpay Checkout → **webhook** verifies → client polls `GET /api/payments/{order_id}/status`. See [PAY_TO_RANK.md](./PAY_TO_RANK.md).
- **Legacy listing / supporter buttons:** `POST /api/create-order` and `POST /api/payments/order` still exist for older listing and on-page hype/bid buttons.
- **Webhook:** `POST /api/webhooks/razorpay` for `payment.captured` and `order.paid`. Arena rows in `payments` are applied first.

Do not trust a client-chosen required amount. The server re-reads the current highest verified bid at order-create time.

## Local test

1. `npm run dev`
2. Open `http://localhost:3000/checkout` (also linked from `/pricing`)
3. Click **Pay ₹1**
4. Use a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-details/) (for example `4111 1111 1111 1111`)
5. Success shows **Payment verified.** Dismissing the modal shows **Payment cancelled.**
