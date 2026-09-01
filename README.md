# ViralRank.buzz

Paid creator ranking arena. **Submit. Hype. Rank. Go Viral.**

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Razorpay

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase + Razorpay keys.
2. Create a [Supabase](https://supabase.com) project.
3. In the Supabase SQL editor, run migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_flavor_categories.sql`
   - `supabase/migrations/0003_listing_payment.sql` (**required** — listing payment columns + auto-publish RPC)
   - If you previously applied a review-queue migration, also run `supabase/migrations/0005_restore_listing_auto_publish.sql`
   - **Categories only?** Run `supabase/seed/categories.sql` instead of relying on auto-seed.
   - On first load of `/submit` or `POST /api/creators`, the server also auto-seeds categories via the service role when the table exists but is empty.
   - **Demo listings for an empty site:** run `supabase/seed/demo-creators.sql` (20 `vrseed_*` creators, already paid/visible).
4. From Supabase **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (use `https://<ref>.supabase.co` only — **not** the `/rest/v1` REST endpoint)
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)
5. Restart `npm run dev` after changing env vars.
6. Probe: `GET /api/creators/status` should return `canSubmitCreators: true` and `categoriesReady: true` with `categoryCount` ≥ 20.
7. Set a user `profiles.is_admin = true` for `/admin`.
8. Point the Razorpay webhook to `https://your-domain/api/webhooks/razorpay` for events **`payment.captured`** and **`order.paid`**. Set `RAZORPAY_WEBHOOK_SECRET` from the Razorpay Dashboard webhook secret (server-only).
9. `npm install` then `npm run dev`.

### Creator submissions (Add Creator form)

`POST /api/creators` inserts into Supabase `public.creators` using the **service role** key (RLS blocks direct client inserts). Required env:

| Variable | Required for submit |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (auth, reads, rest of app) |

Without the service role key, the form shows **Creator submissions are not configured yet.** All manual fields (name, username, URL, category, location, email, phone, image, followers, views, bio) are saved on success. New creators are inserted with `status: pending_payment` and `listing_payment_status: pending` — they **do not** appear publicly until a ₹199 Razorpay listing payment is verified server-side (`POST /api/payments/verify-listing` or webhook).

### Listing payment flow (₹199)

1. User submits the Rank a Creator form → `POST /api/creators` saves a hidden creator.
2. Frontend opens Razorpay checkout via `POST /api/payments/listing-order`.
3. After payment, frontend calls `POST /api/payments/verify-listing` with Razorpay signature (never trust client-only success).
4. On verified payment (automatic — no admin step): RPC `apply_verified_listing_payment` sets `listing_payment_status → paid`, `status → active`, `published_at → now()`.
5. Backup: Razorpay webhook at `/api/webhooks/razorpay` runs the same RPC if the browser closes before verify-listing returns.
6. Client polls `/api/payments/status?kind=listing_payment` briefly after checkout dismiss as a third fallback.
7. Creator becomes visible on `/`, `/creators`, `/explore`, `/rankings`, and `/creator/[username]`.

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
