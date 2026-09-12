-- No-auth pay-to-rank arena: payments ledger, Instagram cache, visits, rank-by-max-bid.

alter table public.creators
  add column if not exists stats_fetched_at timestamptz,
  add column if not exists edit_token text,
  add column if not exists current_rank_bid integer not null default 0;

create unique index if not exists creators_edit_token_idx
  on public.creators (edit_token)
  where edit_token is not null;

update public.creators
set current_rank_bid = greatest(current_rank_bid, round(coalesce(current_highest_bid, 0))::integer)
where current_rank_bid = 0;

create table if not exists public.instagram_profile_cache (
  handle text primary key,
  display_name text,
  profile_photo_url text,
  follower_count integer,
  bio text,
  is_verified boolean,
  payload jsonb,
  fetched_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_session_created_idx on public.visits (session_hash, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators (id) on delete set null,
  type text not null check (type in ('rank_bid', 'hype')),
  amount integer not null,
  amount_inr integer not null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  payer_email text,
  payer_phone text,
  coupon_code text,
  edit_token text unique,
  instagram_handle text not null,
  category_id uuid references public.categories (id),
  required_amount_inr integer,
  took_rank boolean,
  webhook_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_creator_status_idx on public.payments (creator_id, status);
create index if not exists payments_handle_idx on public.payments (instagram_handle);

create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_type text,
  razorpay_payment_id text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists webhook_logs_created_at_idx on public.webhook_logs (created_at desc);

create or replace view public.creator_effective_bids
with (security_invoker = true) as
select
  c.id as creator_id,
  coalesce((
    select max(p.amount_inr)
    from public.payments p
    where p.creator_id = c.id
      and p.type = 'rank_bid'
      and p.status = 'verified'
  ), 0)::integer as effective_bid
from public.creators c;

create or replace function public.recompute_pay_to_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators c
  set
    current_rank_bid = coalesce(e.effective_bid, 0),
    current_highest_bid = coalesce(e.effective_bid, 0)
  from public.creator_effective_bids e
  where e.creator_id = c.id;

  with ranked as (
    select
      id,
      row_number() over (
        order by current_rank_bid desc, published_at asc nulls last, created_at asc
      ) as r
    from public.creators
    where status = 'active'
      and listing_payment_status = 'paid'
      and current_rank_bid > 0
  )
  update public.creators c
  set current_rank = ranked.r, rank_set_at = now()
  from ranked
  where c.id = ranked.id;

  update public.creators
  set current_rank = null
  where status <> 'active'
     or listing_payment_status <> 'paid'
     or current_rank_bid <= 0;
end;
$$;

revoke all on function public.recompute_pay_to_rank() from public, anon, authenticated;
grant execute on function public.recompute_pay_to_rank() to service_role;

alter table public.instagram_profile_cache enable row level security;
alter table public.visits enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_logs enable row level security;

revoke all on public.instagram_profile_cache from anon, authenticated;
revoke all on public.visits from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.webhook_logs from anon, authenticated;
grant all on public.instagram_profile_cache to service_role;
grant all on public.visits to service_role;
grant all on public.payments to service_role;
grant all on public.webhook_logs to service_role;

grant select on public.creator_effective_bids to anon, authenticated, service_role;
