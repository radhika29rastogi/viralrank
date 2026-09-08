-- Security hardening: revoke public EXECUTE on SECURITY DEFINER RPCs,
-- protect ranking/click fields, assert listing payment amounts, audit log.

-- ---------------------------------------------------------------------------
-- 1. Revoke PUBLIC/anon/authenticated execute on sensitive RPCs
-- ---------------------------------------------------------------------------
revoke all on function public.recalculate_creator_ranks() from public, anon, authenticated;
revoke all on function public.sync_live_battle() from public, anon, authenticated;
revoke all on function public.apply_verified_ranking_bid(uuid, numeric, uuid, text, text) from public, anon, authenticated;
revoke all on function public.apply_verified_hype(uuid, numeric, uuid, text, text) from public, anon, authenticated;
revoke all on function public.apply_verified_listing_payment(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.increment_profile_clicks(uuid) from public, anon, authenticated;

-- increment_creator_hype(uuid) is obsolete (paid-only hype via apply_verified_hype).
-- It is created only by 0006 and is absent on this production database.
-- Do not CREATE it. Revoke only when it already exists so PUBLIC cannot call free hype.
-- increment_instagram_clicks(uuid) is also 0006-only; skip revoke/grant when missing.
do $$
begin
  if to_regprocedure('public.increment_creator_hype(uuid)') is not null then
    execute 'revoke all on function public.increment_creator_hype(uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.increment_instagram_clicks(uuid)') is not null then
    execute 'revoke all on function public.increment_instagram_clicks(uuid) from public, anon, authenticated';
  end if;
end $$;

grant execute on function public.recalculate_creator_ranks() to service_role;
grant execute on function public.sync_live_battle() to service_role;
grant execute on function public.apply_verified_ranking_bid(uuid, numeric, uuid, text, text) to service_role;
grant execute on function public.apply_verified_hype(uuid, numeric, uuid, text, text) to service_role;
grant execute on function public.apply_verified_listing_payment(uuid, uuid, text, text) to service_role;
grant execute on function public.increment_profile_clicks(uuid) to service_role;

do $$
begin
  if to_regprocedure('public.increment_instagram_clicks(uuid)') is not null then
    execute 'grant execute on function public.increment_instagram_clicks(uuid) to service_role';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Protect ranking columns including instagram_clicks / payment status fields
-- ---------------------------------------------------------------------------
create or replace function public.protect_ranking_columns()
returns trigger
language plpgsql
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    case
      when coalesce(current_setting('request.jwt.claims', true), '') in ('', '{}') then null
      else current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    end,
    ''
  );

  if jwt_role in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.current_highest_bid := 0;
      new.current_rank := null;
      new.profile_clicks := 0;
      new.instagram_clicks := 0;
      new.hype_count := 0;
      new.total_hype_amount := 0;
      new.listing_payment_status := 'pending';
      new.published_at := null;
      return new;
    end if;

    if new.current_rank is distinct from old.current_rank
      or new.current_highest_bid is distinct from old.current_highest_bid
      or new.profile_clicks is distinct from old.profile_clicks
      or new.instagram_clicks is distinct from old.instagram_clicks
      or new.hype_count is distinct from old.hype_count
      or new.total_hype_amount is distinct from old.total_hype_amount
      or new.rank_set_at is distinct from old.rank_set_at
      or new.listing_payment_status is distinct from old.listing_payment_status
      or new.published_at is distinct from old.published_at
      or new.status is distinct from old.status
    then
      raise exception 'Protected ranking fields cannot be written by clients';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Ranking: paid hype primary, bids secondary, published_at tie-break
-- ---------------------------------------------------------------------------
create or replace function public.recalculate_creator_ranks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
  set current_rank = null
  where status is distinct from 'active'
     or listing_payment_status is distinct from 'paid';

  update public.creators c
  set current_rank = ranked.rank
  from (
    select
      id,
      rank() over (
        order by
          hype_count desc,
          total_hype_amount desc,
          current_highest_bid desc,
          coalesce(published_at, created_at) asc,
          id asc
      ) as rank
    from public.creators
    where status = 'active'
      and listing_payment_status = 'paid'
  ) ranked
  where c.id = ranked.id;
end;
$$;

revoke all on function public.recalculate_creator_ranks() from public, anon, authenticated;
grant execute on function public.recalculate_creator_ranks() to service_role;

-- ---------------------------------------------------------------------------
-- 4. Listing payment RPC: assert amount. Coupon bookkeeping is 0006-only.
-- listing_coupons is created by 0006_platform_upgrade.sql and is absent here.
-- Do not CREATE that table. Keep paid listing verification either way.
-- ---------------------------------------------------------------------------
create or replace function public.apply_verified_listing_payment(
  p_creator_id uuid,
  p_payment_row_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text,
  p_paid_amount_paise integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_listing_payments%rowtype;
  v_expected_paise integer;
begin
  select * into v_row
  from public.creator_listing_payments
  where id = p_payment_row_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment record not found.');
  end if;

  if v_row.creator_id is distinct from p_creator_id then
    return jsonb_build_object('ok', false, 'error', 'Creator mismatch.');
  end if;

  if v_row.is_verified then
    return jsonb_build_object('ok', true, 'already_verified', true);
  end if;

  v_expected_paise := round(v_row.amount * 100)::integer;
  if p_paid_amount_paise is not null and p_paid_amount_paise is distinct from v_expected_paise then
    return jsonb_build_object(
      'ok', false,
      'error', 'Paid amount does not match the order amount.'
    );
  end if;

  update public.creator_listing_payments
  set
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = p_razorpay_signature,
    payment_status = 'captured',
    is_verified = true
  where id = p_payment_row_id;

  update public.creators
  set
    status = 'active',
    listing_payment_status = 'paid',
    published_at = coalesce(published_at, now())
  where id = p_creator_id
    and listing_payment_status is distinct from 'paid';

  perform public.recalculate_creator_ranks();
  perform public.sync_live_battle();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.apply_verified_listing_payment(uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.apply_verified_listing_payment(uuid, uuid, text, text, integer) to service_role;

create or replace function public.apply_verified_listing_payment(
  p_creator_id uuid,
  p_payment_row_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.apply_verified_listing_payment(
    p_creator_id,
    p_payment_row_id,
    p_razorpay_payment_id,
    p_razorpay_signature,
    null
  );
end;
$$;

revoke all on function public.apply_verified_listing_payment(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_verified_listing_payment(uuid, uuid, text, text) to service_role;

-- If 0006 already created listing_coupons + coupon_code, upgrade to coupon-aware body.
do $$
begin
  if to_regclass('public.listing_coupons') is null then
    return;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creator_listing_payments'
      and column_name = 'coupon_code'
  ) then
    return;
  end if;

  execute $fn$
    create or replace function public.apply_verified_listing_payment(
      p_creator_id uuid,
      p_payment_row_id uuid,
      p_razorpay_payment_id text,
      p_razorpay_signature text,
      p_paid_amount_paise integer default null
    )
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $body$
    declare
      v_row public.creator_listing_payments%rowtype;
      v_coupon public.listing_coupons%rowtype;
      v_expected_paise integer;
    begin
      select * into v_row
      from public.creator_listing_payments
      where id = p_payment_row_id
      for update;

      if not found then
        return jsonb_build_object('ok', false, 'error', 'Payment record not found.');
      end if;

      if v_row.creator_id is distinct from p_creator_id then
        return jsonb_build_object('ok', false, 'error', 'Creator mismatch.');
      end if;

      if v_row.is_verified then
        return jsonb_build_object('ok', true, 'already_verified', true);
      end if;

      v_expected_paise := round(v_row.amount * 100)::integer;
      if p_paid_amount_paise is not null and p_paid_amount_paise is distinct from v_expected_paise then
        return jsonb_build_object(
          'ok', false,
          'error', 'Paid amount does not match the order amount.'
        );
      end if;

      if v_row.coupon_code is not null then
        select * into v_coupon
        from public.listing_coupons
        where code = v_row.coupon_code
          and active = true
        for update;

        if not found then
          return jsonb_build_object('ok', false, 'error', 'Coupon is no longer valid.');
        end if;

        if v_coupon.max_uses is not null and v_coupon.use_count >= v_coupon.max_uses then
          return jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached.');
        end if;
      end if;

      update public.creator_listing_payments
      set
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_razorpay_signature,
        payment_status = 'captured',
        is_verified = true
      where id = p_payment_row_id;

      if v_row.coupon_code is not null then
        update public.listing_coupons
        set use_count = use_count + 1
        where code = v_row.coupon_code
          and active = true
          and (max_uses is null or use_count < max_uses);
      end if;

      update public.creators
      set
        status = 'active',
        listing_payment_status = 'paid',
        published_at = coalesce(published_at, now())
      where id = p_creator_id
        and listing_payment_status is distinct from 'paid';

      perform public.recalculate_creator_ranks();
      perform public.sync_live_battle();

      return jsonb_build_object('ok', true);
    end;
    $body$;
  $fn$;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Public creator view without PII (optional read path)
-- instagram_clicks is 0006-only; omit it when the column is missing.
-- ---------------------------------------------------------------------------
do $$
declare
  has_ig_clicks boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creators'
      and column_name = 'instagram_clicks'
  ) into has_ig_clicks;

  if has_ig_clicks then
    execute $v$
      create or replace view public.creators_public
      with (security_invoker = true)
      as
      select
        id,
        instagram_username,
        instagram_url,
        name,
        bio,
        profile_image_url,
        category_id,
        location,
        followers,
        average_views,
        instagram_data_source,
        current_highest_bid,
        current_rank,
        rank_set_at,
        profile_clicks,
        instagram_clicks,
        hype_count,
        total_hype_amount,
        status,
        listing_payment_status,
        published_at,
        created_at,
        updated_at
      from public.creators
      where status = 'active'
        and listing_payment_status = 'paid'
    $v$;
  else
    execute $v$
      create or replace view public.creators_public
      with (security_invoker = true)
      as
      select
        id,
        instagram_username,
        instagram_url,
        name,
        bio,
        profile_image_url,
        category_id,
        location,
        followers,
        average_views,
        instagram_data_source,
        current_highest_bid,
        current_rank,
        rank_set_at,
        profile_clicks,
        hype_count,
        total_hype_amount,
        status,
        listing_payment_status,
        published_at,
        created_at,
        updated_at
      from public.creators
      where status = 'active'
        and listing_payment_status = 'paid'
    $v$;
  end if;
end $$;

grant select on public.creators_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Security audit log
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_audit_log enable row level security;
revoke all on public.security_audit_log from anon, authenticated;
grant insert, select on public.security_audit_log to service_role;

do $$
begin
  if to_regprocedure('public.recalculate_creator_ranks()') is not null then
    perform public.recalculate_creator_ranks();
  end if;
  if to_regprocedure('public.sync_live_battle()') is not null then
    perform public.sync_live_battle();
  end if;
end $$;
