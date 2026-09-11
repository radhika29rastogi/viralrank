# Production launch — ViralRank.buzz

Do not treat the site as production-ready until confirmation email and password-reset email have been received and the links work.

## 1. Environment variables (Vercel)

Add these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use preview deploys). Names are exact.

| Variable | Required | Public / secret | Where | Value |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public | Vercel + local `.env.local` | `https://www.viralrank.buzz` (users land on www) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Vercel + local `.env.local` | `https://<project-ref>.supabase.co` — no `/rest/v1` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Vercel + local `.env.local` | Supabase **anon / publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret** | Vercel + local `.env.local` only (never `NEXT_PUBLIC_`) | Supabase **service_role** key |
| `RAZORPAY_KEY_ID` | Yes (payments) | **Secret** | Vercel + local `.env.local` | Live Key ID (`rzp_live_…`) for production |
| `RAZORPAY_KEY_SECRET` | Yes (payments) | **Secret** | Vercel + local `.env.local` | Matching Key Secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes (payments) | Public | Vercel + local `.env.local` | **Must equal** `RAZORPAY_KEY_ID` |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes in production** | **Secret** | Vercel + local `.env.local` | Razorpay webhook signing secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Public | Leave empty for launch | Only if a Turnstile widget is on `/submit` |
| `TURNSTILE_SECRET_KEY` | No | **Secret** | Leave empty for launch | Only with the site key + widget |

`.env` and `.env.local` are gitignored. Only `.env.example` is committed.

## 2. Supabase dashboard

Project currently used by this app: host `tpadjhjjvhtijmxkzhdo.supabase.co` (confirm in Project Settings → API).

### Authentication → URL Configuration

- **Site URL:** `https://viralrank.buzz` (do **not** set Site URL to localhost)
- **Redirect URLs:**
  - `https://viralrank.buzz/auth/callback`
  - `https://www.viralrank.buzz/auth/callback`
  - `http://localhost:3000/auth/callback` (local only)

### Authentication → Providers → Email

- Enable email signup
- Enable **Confirm email**
- Password reset stays enabled (default)

### Authentication → Emails / SMTP

Supabase built-in mail is rate-limited and often lands in spam. For launch, configure a real SMTP provider (Resend, Amazon SES, Postmark, or similar) under **Project Settings → Authentication → SMTP**.

Until a confirmation email and a reset email have been received, email auth is **not verified**.

### SQL editor — migrations (in order, skip already-applied)

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_flavor_categories.sql`
3. `supabase/migrations/0003_listing_payment.sql`
4. `supabase/migrations/0006_platform_upgrade.sql`
5. `supabase/migrations/0007_security_hardening.sql`
6. `supabase/migrations/0008_hide_payment_pii.sql` (**new — required before launch**)
7. Only if you previously applied a review-queue migration: `0005_restore_listing_auto_publish.sql`

Do **not** run `supabase/seed/demo-creators.sql` on production unless you intentionally want demo listings.

Verify after 0007:

```sql
select
  has_function_privilege('anon', 'apply_verified_hype(uuid,numeric,uuid,text,text)', 'EXECUTE') as anon_can_hype,
  has_function_privilege('anon', 'apply_verified_ranking_bid(uuid,numeric,uuid,text,text)', 'EXECUTE') as anon_can_bid,
  to_regprocedure('public.increment_creator_hype(uuid)') as free_hype_fn;
```

All three must be `false`.

### Storage

Migration `0006` creates bucket `creator-images`. Confirm it exists under **Storage**.

### Admin user

```sql
update public.profiles
set is_admin = true
where id = '<auth user uuid>';
```

## 3. Razorpay

1. Use a **live** Key ID + Key Secret pair in Vercel production.
2. Webhook URL: `https://www.viralrank.buzz/api/webhooks/razorpay`
3. Events: `payment.captured`, `order.paid`
4. Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`

## 4. Domain / Vercel

Already live: `https://viralrank.buzz` → 308 → `https://www.viralrank.buzz`.

Keep that redirect. Add both hosts in Vercel **Domains**. After setting env vars, **redeploy** (env changes do not apply to an old deployment).

Do not set Turnstile keys until a widget exists on `/submit`.

## 5. Deploy

```bash
git add -A
git commit -m "Prepare production launch"
git push origin main
```

If the Vercel project is linked to GitHub, the push deploys. Otherwise:

```bash
npx vercel --prod
```

Then smoke-test:

- `https://www.viralrank.buzz/`
- `https://www.viralrank.buzz/explore`
- `https://www.viralrank.buzz/signup`
- `https://www.viralrank.buzz/api/categories` → 20 `{id,name,slug}` objects
- `https://www.viralrank.buzz/api/creators/status` → `{ configured, canSubmitCreators, listingPaymentSchemaReady, categoriesReady, categoryCount }` only (no key formats)

## 6. Creator visibility (homepage / explore / rankings)

A row in `public.creators` is **not** enough to show on the homepage. Public pages query `creators` with explicit columns (not `select *`, not a nested `categories` embed). `creators_public` is a 0007 view used as an optional read path; the app does not depend on it.

A creator is listed only when **both** are true:

- `status = 'active'`
- `listing_payment_status = 'paid'` (verified ₹199 listing payment)

Inserts start as `status = 'pending_payment'` and `listing_payment_status = 'pending'`. RLS policy `published creators are public` hides those from everyone except the owner (`user_id = auth.uid()`). Do **not** relax that policy.

If paid+active rows exist but Explore/home still show “No creators”:

1. Confirm the query does **not** `select *` or `instagram_clicks` (that column is 0006-only; a missing column or stale PostgREST cache returns `PGRST204` and the UI renders an empty list).
2. Confirm categories are loaded in a **separate** query. Embedding `categories:category_id(...)` on the creator select can fail the whole listing.
3. Confirm `GET /api/creators?sort=trending&limit=12` returns `items` (older deploys required `username` and returned 400).

Pending unpaid submissions will still not appear. That is intentional. Do not change production rows by hand to force visibility.
