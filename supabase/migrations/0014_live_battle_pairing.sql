-- Live battle pairing is always RANK() over combined_score (creator_live_ranks).
-- The battles table is a history log of pairing changes, never the widget source of truth.
-- 8pm daily_battle_results still decides who "won the day" for the current pair.

create or replace function public.sync_live_battle()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  one record;
  two record;
  live_row public.battles%rowtype;
begin
  select c.id, c.combined_score
  into one
  from public.creator_live_ranks r
  join public.creators c on c.id = r.creator_id
  where r.live_rank in (1, 2)
    and c.combined_score > 0
  order by r.live_rank asc, r.combined_score desc, r.score_reached_at asc nulls last
  limit 1;

  if not found then
    update public.battles
    set status = 'completed', ended_at = now()
    where status = 'live';
    return;
  end if;

  select c.id, c.combined_score
  into two
  from public.creator_live_ranks r
  join public.creators c on c.id = r.creator_id
  where r.live_rank in (1, 2)
    and c.combined_score > 0
    and c.id is distinct from one.id
  order by r.live_rank asc, r.combined_score desc, r.score_reached_at asc nulls last
  limit 1;

  if not found then
    update public.battles
    set status = 'completed', ended_at = now()
    where status = 'live';
    return;
  end if;

  select * into live_row from public.battles where status = 'live' order by created_at desc limit 1;

  if not found
    or live_row.creator_one_id is distinct from one.id
    or live_row.creator_two_id is distinct from two.id
  then
    update public.battles
    set status = 'completed', ended_at = now()
    where status = 'live';

    insert into public.battles (
      creator_one_id, creator_two_id, creator_one_bid, creator_two_bid, winner_id, status
    ) values (
      one.id, two.id, one.combined_score, two.combined_score, null, 'live'
    );
  else
    update public.battles
    set
      creator_one_bid = one.combined_score,
      creator_two_bid = two.combined_score
    where id = live_row.id;
  end if;
end;
$$;

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

  perform public.sync_live_battle();

  return jsonb_build_object('ok', true, 'duplicate', false, 'score_applied', applied);
end;
$$;

revoke all on function public.sync_live_battle() from public, anon, authenticated;
revoke all on function public.finalize_combined_score_payment(uuid, text, uuid, text, text, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.sync_live_battle() to service_role;
grant execute on function public.finalize_combined_score_payment(uuid, text, uuid, text, text, text, boolean, jsonb) to service_role;

select public.sync_live_battle();
notify pgrst, 'reload schema';
