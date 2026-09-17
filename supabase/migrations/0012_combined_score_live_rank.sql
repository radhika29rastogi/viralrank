-- Combined score is generated so bid + hype cannot drift.
-- Live rank is computed at query time (creator_live_ranks), not rewritten across every creator on each payment.

alter table public.creators
  add column if not exists score_reached_at timestamptz;

update public.creators
set score_reached_at = coalesce(score_reached_at, ranking_score_at, rank_set_at, published_at, created_at)
where score_reached_at is null
  and (coalesce(current_highest_bid, 0) > 0 or coalesce(total_hype_amount, 0) > 0);

drop view if exists public.creator_live_ranks;

alter table public.creators drop column if exists combined_score;
alter table public.creators
  add column combined_score integer
  generated always as (
    round(coalesce(current_highest_bid, 0))::integer
    + coalesce(total_hype_amount, 0)::integer
  ) stored;

create index if not exists idx_creators_combined_score
  on public.creators (combined_score desc, score_reached_at asc nulls last);

-- Public listings only. Rank is RANK() over combined_score, then first-come score_reached_at.
create or replace view public.creator_live_ranks
with (security_invoker = true) as
select
  c.id as creator_id,
  c.combined_score,
  c.score_reached_at,
  rank() over (
    order by
      c.combined_score desc,
      c.score_reached_at asc nulls last,
      c.published_at asc nulls last,
      c.created_at asc
  ) as live_rank
from public.creators c
where c.status = 'active'
  and c.listing_payment_status = 'paid'
  and c.combined_score > 0;

grant select on public.creator_live_ranks to anon, authenticated, service_role;

-- Ranking bid: raise current_highest_bid only; generated combined_score follows.
-- score_reached_at is set in the same UPDATE that changes the score.
create or replace function public.apply_combined_score_bid(p_creator_id uuid, p_bid_amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if p_bid_amount is null or p_bid_amount < 199 then
    return false;
  end if;
  update public.creators
  set
    current_highest_bid = p_bid_amount,
    current_rank_bid = p_bid_amount,
    score_reached_at = now(),
    ranking_score_at = now(),
    ranking_score = p_bid_amount + round(coalesce(total_hype_amount, 0))::integer,
    verified_hype_total = round(coalesce(total_hype_amount, 0))::integer
  where id = p_creator_id
    and coalesce(current_highest_bid, 0) < p_bid_amount;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Hype: always adds. No increment gate. score_reached_at set in the same UPDATE.
create or replace function public.apply_combined_score_hype(p_creator_id uuid, p_hype_amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if p_hype_amount is null or p_hype_amount < 49 then
    return false;
  end if;
  update public.creators
  set
    total_hype_amount = coalesce(total_hype_amount, 0) + p_hype_amount,
    hype_count = coalesce(hype_count, 0) + 1,
    score_reached_at = now(),
    ranking_score_at = now(),
    ranking_score = round(coalesce(current_highest_bid, 0))::integer
      + round(coalesce(total_hype_amount, 0))::integer
      + p_hype_amount,
    verified_hype_total = round(coalesce(total_hype_amount, 0))::integer + p_hype_amount
  where id = p_creator_id;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Payment verify + score write in one transaction so a retried webhook cannot double-apply hype.
create or replace function public.finalize_combined_score_payment(
  p_payment_id uuid,
  p_razorpay_payment_id text,
  p_creator_id uuid,
  p_payer_email text,
  p_payer_phone text,
  p_edit_token text,
  p_took_rank boolean,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  bid integer;
  applied boolean := false;
begin
  update public.payments
  set
    status = 'verified',
    razorpay_payment_id = p_razorpay_payment_id,
    creator_id = p_creator_id,
    payer_email = coalesce(p_payer_email, payer_email),
    payer_phone = coalesce(p_payer_phone, payer_phone),
    edit_token = coalesce(p_edit_token, edit_token),
    took_rank = p_took_rank,
    verified_at = now(),
    webhook_payload = p_payload
  where id = p_payment_id
    and status = 'pending'
  returning * into pay;

  if not found then
    select * into pay
    from public.payments
    where razorpay_payment_id = p_razorpay_payment_id
       or id = p_payment_id
    limit 1;
    if pay.status = 'verified' then
      return jsonb_build_object('ok', true, 'duplicate', true, 'score_applied', false);
    end if;
    return jsonb_build_object('ok', false, 'error', 'Could not verify payment.');
  end if;

  bid := coalesce(pay.bid_amount, pay.amount_inr, 0);

  if pay.type = 'rank_bid' then
    applied := public.apply_combined_score_bid(p_creator_id, bid);
  elsif pay.type = 'hype' then
    applied := public.apply_combined_score_hype(p_creator_id, bid);
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false, 'score_applied', applied);
end;
$$;

revoke all on function public.apply_combined_score_bid(uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_combined_score_hype(uuid, integer) from public, anon, authenticated;
revoke all on function public.finalize_combined_score_payment(uuid, text, uuid, text, text, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.apply_combined_score_bid(uuid, integer) to service_role;
grant execute on function public.apply_combined_score_hype(uuid, integer) to service_role;
grant execute on function public.finalize_combined_score_payment(uuid, text, uuid, text, text, text, boolean, jsonb) to service_role;

-- Optional cached current_rank for dashboards/notifications. Live pages must not rely on this.
create or replace function public.refresh_cached_current_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators c
  set current_rank = r.live_rank, rank_set_at = coalesce(c.score_reached_at, now())
  from public.creator_live_ranks r
  where r.creator_id = c.id;

  update public.creators
  set current_rank = null
  where id not in (select creator_id from public.creator_live_ranks);
end;
$$;

revoke all on function public.refresh_cached_current_rank() from public, anon, authenticated;
grant execute on function public.refresh_cached_current_rank() to service_role;

select public.refresh_cached_current_rank();
notify pgrst, 'reload schema';
