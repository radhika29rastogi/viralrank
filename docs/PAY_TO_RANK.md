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

`combined_score = current_highest_bid + total_hype_amount` (Postgres generated column)

- `current_highest_bid` = `MAX(bid_amount)` of verified `rank_bid` payments (never `amount_charged`).
- `total_hype_amount` = `SUM(bid_amount)` of verified `hype` payments (never `amount_charged`).
- Live rank is computed at query time: `RANK() OVER (ORDER BY combined_score DESC, score_reached_at ASC)` via view `creator_live_ranks`. Stored `current_rank` is a cache only (refreshed by `refresh_cached_current_rank()` on the daily battle cron). Leaderboard, battle, and profile always overlay the live rank. The battle widget reads live ranks 1 and 2 from that view — never a stale `battles` row. See [BATTLES.md](./BATTLES.md).
- Tie-break: earlier `score_reached_at` (timestamp of the verified payment that last changed combined score) ranks higher.
- Bid floor for a valid next bid is still `current_highest_bid + ₹100`. First listing is `MIN_RANKING_BID` (₹199). `bidNeededForRank` for a first listing (no current bid) is that same ₹199 — it does not add +1 over the rival score.
- Atomic webhook writes: `finalize_combined_score_payment` verifies the payment row then `apply_combined_score_bid` / `apply_combined_score_hype` in the same transaction. Do not recompute every creator's stored rank on each payment.
- **Today** = the same formula on verified payments since midnight IST.

Do not compute rank in the browser. Coupons never change scoring value — `bid_amount` scores, `amount_charged` is what Razorpay collects.

If two overtake bids race: the webhook re-checks. If the amount is no longer enough for #1, the row is still `verified` with `took_rank=false`. Money is not refunded. See `/terms` and `/rules`.

## Coupons

Generic codes live in `coupons` (seed `WELCOME50` = ₹50 off, 50 uses). **Coupons apply to ranking bids only** — hype checkout has no coupon UI, and `POST /api/coupons/preview` plus `createArenaOrder` reject `payment_type=hype` with "Coupons can only be applied to ranking bids." Preview does **not** increment `used_count`. Razorpay is charged `amount_charged` (never below `MIN_COUPON_CHARGE` / ₹49); rank uses `bid_amount`. `used_count` increments only in the verified webhook (`try_increment_coupon_use`).

## Daily battle

Independent of who is currently #1 vs #2. The pairing is live combined-score rank (see [BATTLES.md](./BATTLES.md)). Vercel Cron `30 14 * * *` (20:00 IST) hits `GET /api/cron/daily-battle` with `Authorization: Bearer CRON_SECRET`. Window is the previous 20:00 IST → this 20:00 IST. Winner = more verified hype in the window; if neither received hype (or hype ties), `profile_visits + 2×instagram_click_visits`. Stored in `daily_battle_results`. Does not freeze or replace the live pairing.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Real production origin for OG tags (not localhost) |
| `RAPIDAPI_KEY` | Yes (lookup) | RapidAPI key. Server only. Never `NEXT_PUBLIC_*`. |
| `RAPIDAPI_HOST` | Yes (lookup) | `instagram-looter2.p.rapidapi.com` |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | No | Receipt + manage-link email |
| `ADMIN_SECRET` | No | `/admin?key=` moderation. No login. |
| `RAZORPAY_*` | Yes | See [RAZORPAY.md](./RAZORPAY.md) |
| `CRON_SECRET` | Yes (prod battle) | Vercel Cron bearer for `/api/cron/daily-battle` |

Do not put provider keys on `NEXT_PUBLIC_*`.

## Schema

Apply `supabase/migrations/0010_no_auth_pay_to_rank.sql`, `0011_v3_ranking_coupons_battle.sql`, `0012_combined_score_live_rank.sql`, `0013_category_niches.sql`, and `0014_live_battle_pairing.sql` **before** deploying frontend that reads `combined_score`, `score_reached_at`, `bid_amount` / `amount_charged`, `coupons`, `daily_battle_results`, category `icon` / new niche slugs, or live battle history sync.

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

Creator cards show only explainable counters: **HYPE** (`hype_count` of verified hype payments), **Views** (`profile_clicks`), **Instagram** (`instagram_clicks`), and **Engagement** (those three added together). Do not display a “Viral” index — the old `viralScore()` was a 1–99 log mix of hype rupees, Instagram followers, bid, and clicks with arbitrary weights. It was not ranking and could not be explained to users.

## Out of scope

No admin dashboard UI beyond the secret-key `/admin` page. No refund automation. No Instagram OAuth / creator self-claim.
