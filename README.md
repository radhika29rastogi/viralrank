# ViralRank.buzz

Paid creator ranking arena. **Submit. Hype. Rank. Go Viral.**

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Razorpay

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase + Razorpay keys.
2. Create a [Supabase](https://supabase.com) project.
3. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_flavor_categories.sql`.
   - **Categories only?** Run `supabase/seed/categories.sql` instead.
   - On first load of `/submit` or `POST /api/creators`, the server also auto-seeds categories via the service role when the table exists but is empty.
4. From Supabase **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (use `https://<ref>.supabase.co` only — **not** the `/rest/v1` REST endpoint)
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)
5. Restart `npm run dev` after changing env vars.
6. Probe: `GET /api/creators/status` should return `canSubmitCreators: true` and `categoriesReady: true` with `categoryCount` ≥ 20.
7. Set a user `profiles.is_admin = true` for `/admin`.
8. Point the Razorpay webhook to `https://your-domain/api/webhooks/razorpay` for `payment.captured`.
9. `npm install` then `npm run dev`.

### Creator submissions (Add Creator form)

`POST /api/creators` inserts into Supabase `public.creators` using the **service role** key (RLS blocks direct client inserts). Required env:

| Variable | Required for submit |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (auth, reads, rest of app) |

Without the service role key, the form shows **Creator submissions are not configured yet.** All manual fields (name, username, URL, category, location, email, phone, image, followers, views, bio) are saved on success. New creators get `status: approved` and appear on `/creators`, `/explore`, and `/rankings`.

## Homepage & navbar

The Creators carousel on `/` sits after How it works and before flavor/FAQ. It uses approved creators from Supabase when at least 8 exist; otherwise it pads to 12 cards from `src/lib/demo-creators.ts`. Real cards go to `/creator/[username]`; demo cards go to `/submit`. The header has no Sign In link (auth still lives at `/login` and `/signup`).

Confirm with Razorpay that a pay-to-outrank leaderboard fits their merchant terms before going live.

Ranking and hype totals are written only by the verified webhook using the service role. Client JWT roles cannot update `current_highest_bid`, `current_rank`, `is_verified`, or related fields.

## Instagram profile fetch (Rank a Creator)

`POST /api/instagram/fetch` uses **Instagram Graph API Business Discovery** via **Instagram API with Facebook Login** on `graph.facebook.com`. The browser never calls instagram.com or Meta.

**Why not Instagram Login?** Meta documents Business Discovery under *Instagram API with Facebook Login*. Instagram Login (`graph.instagram.com`) does **not** satisfy “look up another creator by username” for this product. Do not switch hosts without a Meta-documented replacement.

**Endpoint (after config):**

`GET https://graph.facebook.com/{version}/{YOUR_IG_USER_ID}?fields=business_discovery.username({TARGET}){...}&access_token=...`

**What Meta can return** (never invented): username, name, bio, profile image URL, followers, and average views only when recent media includes `view_count`. Category, location, contact email, and phone are **not** returned by Business Discovery — the form leaves those for manual entry.

**What Meta cannot do:** personal accounts, private/age-gated accounts, or arbitrary public profile scraping.

### Server env vars (never `NEXT_PUBLIC_`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `INSTAGRAM_ACCESS_TOKEN` | **Yes** | Long-lived **Facebook User** access token with `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement` |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | **Yes** (set explicitly) | Your professional IG User id (the caller). Resolve via `GET me/accounts?fields=instagram_business_account` |
| `INSTAGRAM_GRAPH_API_VERSION` | Optional | Defaults to `v21.0` |
| `INSTAGRAM_CLIENT_SECRET` | Optional | If set, sends `appsecret_proof` |

`INSTAGRAM_CLIENT_ID` is **not** read by the fetch code.

Live/public apps typically need **App Review / Advanced Access** for those permissions. Graph API Explorer tokens are for development only.

Probe (no secrets): `GET /api/instagram/status` → `{ configured, hasAccessToken, hasBusinessAccountId, apiVersion, ... }`.

Without `INSTAGRAM_ACCESS_TOKEN`, fetch returns `code: "missing_config"` and the Rank a Creator form shows a clear manual-entry message. Restart `npm run dev` after changing env vars.

The Category field on `/submit` is a custom listbox (`CategorySelect`) with options Memes, Videos, Music, Art, Gaming, Tech, Fashion, Lifestyle. The menu is portaled to `document.body`.

### Local test

1. `GET http://localhost:3000/api/instagram/status` — confirm which vars are set.
2. Open `/submit`.
3. Paste `thefitnessgyaan_` or `https://www.instagram.com/thefitnessgyaan_/` and click **Fetch Instagram**.
4. Network: `POST /api/instagram/fetch` — `available: true` only when Meta returns the professional profile.
5. Missing credentials or personal accounts must **not** fake success — username/URL may be prefilled for manual entry.
