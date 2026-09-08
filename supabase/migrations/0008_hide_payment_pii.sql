-- Hide supporter PII and Razorpay secrets from PostgREST clients.
-- RLS previously allowed SELECT * on verified bid/hype rows, which exposed
-- supporter_email, supporter_name, and razorpay_signature to the anon key.
-- App queries only need public activity fields. Service role keeps full access.

revoke select on table public.creator_ranking_bids from anon, authenticated;
revoke select on table public.creator_hypes from anon, authenticated;

grant select (
  id,
  creator_id,
  amount,
  currency,
  is_verified,
  applied_to_rank,
  created_at
) on table public.creator_ranking_bids to anon, authenticated;

grant select (
  id,
  creator_id,
  amount,
  currency,
  is_verified,
  created_at
) on table public.creator_hypes to anon, authenticated;

grant all on table public.creator_ranking_bids to service_role;
grant all on table public.creator_hypes to service_role;
