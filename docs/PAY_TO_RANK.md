# Pay-to-rank arena (no auth)

ViralRank has **no signup/login**. Anyone pastes an Instagram handle, we fetch a real profile snapshot, and Razorpay Checkout collects payment. Listings go live only after the **webhook** verifies the payment.

## Flow

1. `POST /api/instagram/lookup` — server-only RapidAPI Instagram Looter (`GET /profile?username=`). Distinct errors: `config`, `auth`, `rate_limit`, `not_found`, `unknown`. 24h cache in `instagram_profile_cache` plus `creators.stats_fetched_at` when the listing already exists. Fail closed: no empty/fake stats.
2. Preview on `/submit` → Rank Bid only for a **new** handle (₹199 first listing). Hype (₹49+) appears on `/submit` only if that handle is already in `creators`, and on listing cards (`/rankings`, `/explore`, `/creator/[username]`).
3. `POST /api/orders` — re-reads the required amount on the server, creates a Razorpay order, inserts `payments` as `pending`.
4. Client opens Razorpay Checkout. Email/phone are collected by Razorpay.
5. `POST /api/webhooks/razorpay` is the source of truth (`payment.captured` / `order.paid`). Idempotent on `razorpay_payment_id`.
6. Client polls `GET /api/payments/{order_id}/status` and never marks a listing live from the checkout success callback.
7. Receipt + magic manage link: `/manage/{edit_token}` (unguessable). No account area.

## Ranking

Effective rank bid = `MAX(amount_inr)` of `payments` where `type='rank_bid'` and `status='verified'`. Postgres function `recompute_pay_to_rank()` updates `creators.current_rank_bid` / `current_rank`. Hype never changes rank.

**Today** = verified rank bids since midnight IST.

If two overtake bids race: the webhook re-checks. If the amount is no longer enough for #1, the row is still `verified` with `took_rank=false`. Money is not refunded. See `/terms` and `/rules`.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Real production origin for OG tags (not localhost) |
| `RAPIDAPI_KEY` | Yes (lookup) | RapidAPI key. Server only. Never `NEXT_PUBLIC_*`. |
| `RAPIDAPI_HOST` | Yes (lookup) | `instagram-looter2.p.rapidapi.com` |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | No | Receipt + manage-link email |
| `ADMIN_SECRET` | No | `/admin?key=` moderation. No login. |
| `RAZORPAY_*` | Yes | See [RAZORPAY.md](./RAZORPAY.md) |

Do not put provider keys on `NEXT_PUBLIC_*`.

## Schema

Apply `supabase/migrations/0010_no_auth_pay_to_rank.sql` **before** deploying frontend that reads `payments`, `visits`, `instagram_profile_cache`, `current_rank_bid`, or `edit_token`.

Amounts: `payments.amount` is paise; `payments.amount_inr` is integer rupees.

Webhook payloads are stored in `webhook_logs` and pruned after 30 days.

## Theme

Colors live on `:root` and flip under `[data-theme='dark']`:

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--text-primary` / `text-foreground` | `#111` | `#fff8e7` | Headings, body, claim price |
| `--text-secondary` / `text-muted-foreground` | `#4b4b4b` | `#d9ccb3` | Captions, placeholders |
| `--surface` / `bg-cream` | `#fff9e8` | `#1c1814` | Page + cream cards |
| `--card` / `bg-card` | `#fffdf6` | `#241f1a` | Ranking cards, sidebar, filters |
| `--input-bg` / `--input-text` / `--input-placeholder` | white / ink / gray | charcoal / cream / tan | Inputs and selects |
| `--on-accent` | `#111` | `#111` | Text on pink, lemon, sky, lime |

Do not use raw `text-black`, `text-neutral-*`, or hex backgrounds in JSX. `bg-ink` + `text-cream` stay paired so they invert together.

## Performance

The homepage does **not** fetch Instagram. The previous slow path was the root layout awaiting `getLiveStats()` (multiple Supabase queries) on every page, plus `force-dynamic` listing queries. Visitors now load from `/api/visitors`. Rankings/explore/home lists use a 30s `unstable_cache` TTL.

## Honest counters

`visits` records one row per browser session per IST day (`vr_session` cookie). Header and `/stats` show that count. There is no fake “online now” number in v1.

Instagram click-throughs (`GET /api/creators/{id}/instagram` and `POST /api/creators/{id}/click`) increment at most once per visitor per creator per hour.

## Out of scope

No admin dashboard UI beyond the secret-key `/admin` page. No refund automation. No Instagram OAuth / creator self-claim.
