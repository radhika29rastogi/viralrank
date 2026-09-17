-- V3: ranking_score (bid + verified hype), arena coupons, daily battle results.

alter table public.payments
  add column if not exists bid_amount integer,
  add column if not exists amount_charged integer,
  add column if not exists coupon_id uuid,
  add column if not exists verified_at timestamptz;

update public.payments
set
  bid_amount = coalesce(bid_amount, amount_inr),
  amount_charged = coalesce(amount_charged, amount_inr)
where bid_amount is null or amount_charged is null;

alter table public.payments
  alter column bid_amount set default 0,
  alter column amount_charged set default 0;

alter table public.creators
  add column if not exists ranking_score integer not null default 0,
  add column if not exists ranking_score_at timestamptz,
  add column if not exists verified_hype_total integer not null default 0;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_amount integer not null check (discount_amount > 0),
  max_uses integer not null check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists coupons_code_lower_idx on public.coupons (lower(code));

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  ranking_bid_id uuid references public.payments (id) on delete set null,
  hype_id uuid references public.payments (id) on delete set null,
  amount_before integer not null,
  amount_after integer not null,
  created_at timestamptz not null default now(),
  check (ranking_bid_id is not null or hype_id is not null)
);

create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);

alter table public.payments
  drop constraint if exists payments_coupon_id_fkey;
alter table public.payments
  add constraint payments_coupon_id_fkey
  foreign key (coupon_id) references public.coupons (id) on delete set null;

create table if not exists public.daily_battle_results (
  id uuid primary key default gen_random_uuid(),
  battle_date date not null unique,
  creator_one_id uuid references public.creators (id) on delete set null,
  creator_two_id uuid references public.creators (id) on delete set null,
  creator_one_hype_today integer not null default 0,
  creator_two_hype_today integer not null default 0,
  creator_one_engagement_score integer not null default 0,
  creator_two_engagement_score integer not null default 0,
  winner_id uuid references public.creators (id) on delete set null,
  decided_by text not null check (decided_by in ('hype', 'engagement')),
  created_at timestamptz not null default now()
);

create index if not exists creators_ranking_score_idx
  on public.creators (ranking_score desc, ranking_score_at asc nulls last);
create index if not exists creators_category_id_idx on public.creators (category_id);
create index if not exists creators_created_at_idx on public.creators (created_at desc);
create index if not exists creators_current_highest_bid_idx
  on public.creators (current_highest_bid desc);
create index if not exists payments_verified_type_idx
  on public.payments (creator_id, type, status, verified_at desc);

create or replace view public.creator_ranking_scores
with (security_invoker = true) as
select
  c.id as creator_id,
  coalesce((
    select max(coalesce(p.bid_amount, p.amount_inr))
    from public.payments p
    where p.creator_id = c.id
      and p.type = 'rank_bid'
      and p.status = 'verified'
  ), 0)::integer as highest_bid,
  coalesce((
    select sum(coalesce(p.bid_amount, p.amount_inr))
    from public.payments p
    where p.creator_id = c.id
      and p.type = 'hype'
      and p.status = 'verified'
  ), 0)::integer as verified_hype_total,
  (
    coalesce((
      select max(coalesce(p.bid_amount, p.amount_inr))
      from public.payments p
      where p.creator_id = c.id
        and p.type = 'rank_bid'
        and p.status = 'verified'
    ), 0)
    +
    coalesce((
      select sum(coalesce(p.bid_amount, p.amount_inr))
      from public.payments p
      where p.creator_id = c.id
        and p.type = 'hype'
        and p.status = 'verified'
    ), 0)
  )::integer as ranking_score,
  -- Timestamp of the payment that established the current score:
  -- first time the current max bid landed, or the latest verified hype, whichever is later.
  -- Lesser rank bids after the max are ignored so they cannot steal first-come ties.
  greatest(
    (
      select min(coalesce(p.verified_at, p.created_at))
      from public.payments p
      where p.creator_id = c.id
        and p.type = 'rank_bid'
        and p.status = 'verified'
        and coalesce(p.bid_amount, p.amount_inr) = coalesce((
          select max(coalesce(p2.bid_amount, p2.amount_inr))
          from public.payments p2
          where p2.creator_id = c.id
            and p2.type = 'rank_bid'
            and p2.status = 'verified'
        ), 0)
    ),
    (
      select max(coalesce(p.verified_at, p.created_at))
      from public.payments p
      where p.creator_id = c.id
        and p.type = 'hype'
        and p.status = 'verified'
    )
  ) as ranking_score_at
from public.creators c;

create or replace view public.creator_effective_bids
with (security_invoker = true) as
select creator_id, highest_bid as effective_bid
from public.creator_ranking_scores;

create or replace function public.try_increment_coupon_use(p_coupon_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.coupons
  set used_count = used_count + 1
  where id = p_coupon_id
    and is_active
    and used_count < max_uses
    and (expires_at is null or expires_at > now());
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.try_increment_coupon_use(uuid) from public, anon, authenticated;
grant execute on function public.try_increment_coupon_use(uuid) to service_role;

-- ranking_score = current_highest_bid + verified_hype_total
-- current_highest_bid = MAX(bid_amount) of verified rank_bid payments (never amount_charged)
-- verified_hype_total = SUM(bid_amount) of verified hype payments (never amount_charged)
-- Tie-break: earlier ranking_score_at (first to reach the current total) ranks higher.
create or replace function public.recompute_pay_to_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators c
  set
    current_rank_bid = coalesce(s.highest_bid, 0),
    current_highest_bid = coalesce(s.highest_bid, 0),
    verified_hype_total = coalesce(s.verified_hype_total, 0),
    ranking_score = coalesce(s.ranking_score, 0),
    ranking_score_at = s.ranking_score_at,
    total_hype_amount = coalesce(s.verified_hype_total, 0)
  from public.creator_ranking_scores s
  where s.creator_id = c.id;

  with ranked as (
    select
      id,
      row_number() over (
        order by ranking_score desc, ranking_score_at asc nulls last, published_at asc nulls last, created_at asc
      ) as r
    from public.creators
    where status = 'active'
      and listing_payment_status = 'paid'
      and ranking_score > 0
  )
  update public.creators c
  set current_rank = ranked.r, rank_set_at = coalesce(c.ranking_score_at, now())
  from ranked
  where c.id = ranked.id;

  update public.creators
  set current_rank = null
  where status <> 'active'
     or listing_payment_status <> 'paid'
     or ranking_score <= 0;
end;
$$;

revoke all on function public.recompute_pay_to_rank() from public, anon, authenticated;
grant execute on function public.recompute_pay_to_rank() to service_role;

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.daily_battle_results enable row level security;

revoke all on public.coupons from anon, authenticated;
revoke all on public.coupon_redemptions from anon, authenticated;
grant select on public.daily_battle_results to anon, authenticated;
grant all on public.coupons to service_role;
grant all on public.coupon_redemptions to service_role;
grant all on public.daily_battle_results to service_role;

grant select on public.creator_ranking_scores to anon, authenticated, service_role;
grant select on public.creator_effective_bids to anon, authenticated, service_role;

drop policy if exists daily_battle_results_public_read on public.daily_battle_results;
create policy daily_battle_results_public_read
  on public.daily_battle_results
  for select
  to anon, authenticated
  using (true);

insert into public.coupons (code, discount_amount, max_uses, is_active)
select 'WELCOME50', 50, 50, true
where not exists (
  select 1 from public.coupons where lower(code) = 'welcome50'
);

select public.recompute_pay_to_rank();
