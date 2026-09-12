# Production launch — ViralRank.buzz

There is **no product login**. Treat the site as production-ready when Instagram lookup, Razorpay webhook, and `NEXT_PUBLIC_SITE_URL` are live. Optional Resend receipts need a real `RESEND_API_KEY`.

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
| `RAPIDAPI_KEY` | Yes (lookup) | **Secret** | Vercel + local `.env.local` | RapidAPI Instagram Looter key — server only |
| `RAPIDAPI_HOST` | Yes (lookup) | Public host string | Vercel + local `.env.local` | `instagram-looter2.p.rapidapi.com` |
| `RESEND_API_KEY` | No | **Secret** | Vercel + local `.env.local` | Receipt + `/manage/{token}` email |
| `ADMIN_SECRET` | No | **Secret** | Vercel + local `.env.local` | `/admin?key=` only — no login |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Public | Leave empty for launch | Only if a Turnstile widget is on `/submit` |
| `TURNSTILE_SECRET_KEY` | No | **Secret** | Leave empty for launch | Only with the site key + widget |

`.env` and `.env.local` are gitignored. Only `.env.example` is committed.

## 2. Supabase dashboard

Project currently used by this app: host `tpadjhjjvhtijmxkzhdo.supabase.co` (confirm in Project Settings → API).

### Authentication

Product flows do **not** use Supabase Auth. Leave email signup disabled if you are not using leftover admin tooling. Receipts go through Resend (`RESEND_API_KEY`), not Supabase confirmation emails.

### SQL editor — migrations (in order, skip already-applied)

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_flavor_categories.sql`
3. `supabase/migrations/0003_listing_payment.sql`
4. `supabase/migrations/0006_platform_upgrade.sql`
5. `supabase/migrations/0007_security_hardening.sql`
6. `supabase/migrations/0008_hide_payment_pii.sql` (**new — required before launch**)
7. `supabase/migrations/0010_no_auth_pay_to_rank.sql` (**required** before deploying the no-auth submit/homepage)
8. Only if you previously applied a review-queue migration: `0005_restore_listing_auto_publish.sql`

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

The upload API uses bucket **`creator-images`** (public, 5 MB, jpeg/png/webp). That bucket is created by the storage block in `supabase/migrations/0006_platform_upgrade.sql`, or the idempotent excerpt `supabase/migrations/0009_creator_images_storage.sql` if 0006 has not been applied in full.

Confirm **Storage → creator-images** exists. This project’s production bucket was created from that 0006 storage excerpt. Do not make the bucket private; `getPublicUrl` is what the listing form stores.

### Admin

Set `ADMIN_SECRET` and open `/admin?key=<secret>`. There is no login-gated admin.

## 3. Razorpay

1. Use a **live** Key ID + Key Secret pair in Vercel production. `NEXT_PUBLIC_RAZORPAY_KEY_ID` must match `RAZORPAY_KEY_ID`. Never put `RAZORPAY_KEY_SECRET` in a `NEXT_PUBLIC_` variable.
2. Local Standard Checkout test: `/checkout` → `POST /api/create-order` `{ amount }` (paise) → Razorpay modal → `POST /api/verify-payment` HMAC. Details: [RAZORPAY.md](./RAZORPAY.md).
3. Webhook URL: `https://www.viralrank.buzz/api/webhooks/razorpay`
4. Events: `payment.captured`, `order.paid`
5. Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`

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
- `https://www.viralrank.buzz/submit`
- `https://www.viralrank.buzz/stats`
- `https://www.viralrank.buzz/rules`
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
