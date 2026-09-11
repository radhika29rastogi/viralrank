# ViralRank.buzz

Paid creator ranking arena. **Submit. Hype. Rank. Go Viral.**

Public homepage, Explore, Rankings, and `/api/creators` only show creators with `status = active` **and** `listing_payment_status = paid`. Inserts start as `pending_payment` / `pending`; RLS keeps those private until listing payment is verified. Unpaid submissions will not appear on the homepage — that is intentional.

Live visibility bug (fixed in app queries, not by changing RLS): production can have paid listings while Explore still looks empty if the query uses `select *` plus an embedded `categories` join. That PostgREST shape fails (missing `instagram_clicks` in the schema cache, or a failed embed) and returns **zero rows**. The activity feed used a narrow column list, so a paid creator could show as “joined the arena” while Trending stayed empty. Public reads now use explicit columns, attach categories in a second query, and never select `instagram_clicks` until `0006` adds it.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Razorpay

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase + Razorpay keys.
2. Create a [Supabase](https://supabase.com) project.
3. In the Supabase SQL editor, run migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_flavor_categories.sql`
   - `supabase/migrations/0003_listing_payment.sql` (**required** — listing payment columns + auto-publish RPC)
   - `supabase/migrations/0006_platform_upgrade.sql` (**required** — hype ranking, FIRST50 coupon, image storage, click tracking)
   - `supabase/migrations/0007_security_hardening.sql` (**required** — revoke public RPCs, paid-hype ranking, audit log, PII view)
   - `supabase/migrations/0008_hide_payment_pii.sql` (**required** — hide supporter emails and Razorpay signatures from the anon key)
   - If you previously applied a review-queue migration, also run `supabase/migrations/0005_restore_listing_auto_publish.sql`
   - **Categories only?** Run `supabase/seed/categories.sql` instead of relying on auto-seed.
   - On first load of `/submit` or `POST /api/creators`, the server also auto-seeds categories via the service role when the table exists but is empty.
   - **Demo listings for an empty site:** run `supabase/seed/demo-creators.sql` (20 `vrseed_*` creators, already paid/visible).
4. From Supabase **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (use `https://<ref>.supabase.co` only — **not** the `/rest/v1` REST endpoint)
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)
5. Restart `npm run dev` after changing env vars.
6. Auth emails: In Supabase **Authentication → URL Configuration**:
   - **Site URL** (production only) = `https://viralrank.buzz`
   - **Additional Redirect URLs** (do not set Site URL to localhost):
     - `https://viralrank.buzz/auth/callback`
     - `https://www.viralrank.buzz/auth/callback` (production currently 308s apex → www)
     - `http://localhost:3000/auth/callback`
   Confirm email must be **enabled** for signup confirmation messages. Use a working SMTP provider (Authentication → Emails) in production.
7. Probe: `GET /api/creators/status` should return `canSubmitCreators: true` and `categoriesReady: true` with `categoryCount` ≥ 20.
8. Set a user `profiles.is_admin = true` for `/admin`.
9. Point the Razorpay webhook to `https://www.viralrank.buzz/api/webhooks/razorpay` for events **`payment.captured`** and **`order.paid`**. Set `RAZORPAY_WEBHOOK_SECRET` from the Razorpay Dashboard webhook secret (server-only).
10. `npm install` then `npm run dev`.

## Production deploy

See **[docs/PRODUCTION.md](docs/PRODUCTION.md)** for the exact Vercel env vars, Supabase dashboard settings, migrations, SMTP, and domain checklist. Do not mark email as working until a real confirmation email and reset email have been received.

### Creator submissions (Add Creator form)

`POST /api/creators` inserts into Supabase `public.creators` using the **service role** key (RLS blocks direct client inserts). Required env:

| Variable | Required for submit |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (auth, reads, rest of app) |

Without the service role key, the form shows **Creator submissions are not configured yet.** All manual fields (name, username, URL, category, location, email, phone, photo upload, followers, views, bio) are saved on success. New creators are inserted with `status: pending_payment` and `listing_payment_status: pending` — they **do not** appear publicly until Razorpay listing payment is verified server-side.

### Listing payment flow (₹199, FIRST50 → ₹149)

1. User submits the Rank a Creator form (optional photo upload + optional `FIRST50` coupon) → `POST /api/creators` saves a hidden creator.
2. Server validates coupon via `POST /api/coupons/validate` (UI) and again on `POST /api/create-order` — **never trusts client amount**.
3. Razorpay order amount is **19900 paise** (₹199) or **14900 paise** (₹149 with valid FIRST50). Coupon usage is recorded only after verified payment (max 50 successful FIRST50 uses).
4. Frontend opens Razorpay checkout via `POST /api/create-order`.
5. After payment, frontend calls `POST /api/verify-payment` with Razorpay signature (never trust client-only success).
6. On verified payment (automatic — no admin step): RPC `apply_verified_listing_payment` sets `listing_payment_status → paid`, `status → active`, `published_at → now()`, assigns rank via `recalculate_creator_ranks()`.
7. Backup: Razorpay webhook at `/api/webhooks/razorpay` runs the same RPC if the browser closes before verify returns.
8. Client polls `/api/payments/status?kind=listing_payment` briefly after checkout dismiss as a third fallback.
9. Creator becomes visible on `/`, `/creators`, `/explore`, `/rankings`, and `/creator/[username]`.

### Hype, battles, and click tracking

- **Paid hype only:** `POST /api/payments/order` with `kind: "hype"` (₹49+) → Razorpay → verified RPC. Free hype API returns 403.
- Rank formula (server): `hype_count` → `total_hype_amount` → `current_highest_bid` → `published_at`.
- Profile views: `POST /api/profile-clicks` (6h cookie dedup + rate limit).
- Instagram outbound: `GET /api/creators/[id]/instagram` records click then redirects (instagram.com hosts only).
- Live battle UI (`/battles`) loads top two ranked published creators from the database.

Public queries and RLS only expose creators where `status = 'active'` **and** `listing_payment_status = 'paid'`.

## Homepage & navbar

The Creators carousel on `/` shows only published (paid + active) creators from Supabase — no demo/mock padding. The header has no Sign In link (auth still lives at `/login` and `/signup`).

Confirm with Razorpay that a pay-to-outrank leaderboard fits their merchant terms before going live.

Ranking and hype totals are written only by the verified webhook using the service role. Client JWT roles cannot update `current_highest_bid`, `current_rank`, `is_verified`, or related fields.

## Rank a Creator (manual form)

`/submit` is a **manual-only** form. There is no Instagram Graph API lookup, no auto-fill from Meta, and no Instagram access token required.

Users enter creator name, Instagram username/URL, category (from the database), location, contact details, and optional stats, then pay ₹199 to publish.

The Category field loads options dynamically from Supabase via `GET /api/categories` (with loading, error, and retry states).

### Development seed (20 dummy creators)

To populate Explore / Rankings / homepage cards for local testing, run `supabase/seed/demo-creators.sql` in the Supabase SQL Editor.

- Usernames are prefixed `vrseed_` so they are clearly demo data, not real submissions.
- Rows are inserted as `status = active` and `listing_payment_status = paid` (no fake Razorpay payments).
- Safe to re-run (`on conflict do nothing`).
- Requires migration `0003_listing_payment.sql`.
