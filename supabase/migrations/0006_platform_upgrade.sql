-- Platform upgrade: hype ranking, coupons, click tracking, image storage, free hype RPC.

alter table public.creators
  add column if not exists instagram_clicks integer not null default 0;

alter table public.creator_listing_payments
  add column if not exists original_amount numeric(12,2),
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists coupon_code text;

alter table public.creator_listing_payments drop constraint if exists creator_listing_payments_amount_check;
alter table public.creator_listing_payments add constraint creator_listing_payments_amount_check
  check (amount >= 149);

create table if not exists public.listing_coupons (
  code text primary key,
  discount_inr numeric(12,2) not null check (discount_inr > 0),
  max_uses integer,
  use_count integer not null default 0 check (use_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.listing_coupons (code, discount_inr, max_uses, active)
values ('FIRST50', 50, 50, true)
on conflict (code) do update set
  discount_inr = excluded.discount_inr,
  max_uses = excluded.max_uses,
  active = excluded.active;

alter table public.listing_coupons enable row level security;
revoke all on public.listing_coupons from anon, authenticated;

-- Rank all published creators by hype + engagement (server-side only).
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
          profile_clicks desc,
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
  new_winner uuid;
begin
  select * into one
  from public.creators
  where current_rank = 1
  limit 1;

  select * into two
  from public.creators
  where current_rank = 2
  limit 1;

  if one is null or two is null then
    update public.battles
    set status = 'completed', ended_at = now()
    where status = 'live';
    return;
  end if;

  new_winner := case
    when one.hype_count > two.hype_count then one.id
    when two.hype_count > one.hype_count then two.id
    when coalesce(one.published_at, one.created_at) <= coalesce(two.published_at, two.created_at) then one.id
    else two.id
  end;

  select * into live_row from public.battles where status = 'live' order by created_at desc limit 1;

  if live_row.id is null
    or live_row.creator_one_id is distinct from one.id
    or live_row.creator_two_id is distinct from two.id
  then
    update public.battles
    set status = 'completed', ended_at = now()
    where status = 'live';

    insert into public.battles (
      creator_one_id, creator_two_id, creator_one_bid, creator_two_bid, winner_id, status
    ) values (
      one.id, two.id, one.hype_count, two.hype_count, new_winner, 'live'
    );
  else
    update public.battles
    set
      creator_one_bid = one.hype_count,
      creator_two_bid = two.hype_count,
      winner_id = new_winner
    where id = live_row.id;
  end if;
end;
$$;

create or replace function public.increment_creator_hype(p_creator_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hype integer;
  v_rank integer;
begin
  update public.creators
  set hype_count = hype_count + 1
  where id = p_creator_id
    and status = 'active'
    and listing_payment_status = 'paid'
  returning hype_count, current_rank into v_hype, v_rank;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Creator not found or not published.');
  end if;

  perform public.recalculate_creator_ranks();
  perform public.sync_live_battle();

  select hype_count, current_rank into v_hype, v_rank
  from public.creators
  where id = p_creator_id;

  return jsonb_build_object('ok', true, 'hype_count', v_hype, 'rank', v_rank);
end;
$$;

create or replace function public.increment_instagram_clicks(p_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
  set instagram_clicks = instagram_clicks + 1
  where id = p_creator_id
    and status = 'active'
    and listing_payment_status = 'paid';
end;
$$;

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
declare
  v_row public.creator_listing_payments%rowtype;
  v_coupon public.listing_coupons%rowtype;
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
$$;

create or replace function public.apply_verified_hype(
  p_creator_id uuid,
  p_amount numeric,
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
  if p_amount < 49 then
    return jsonb_build_object('ok', false, 'error', 'Minimum hype amount is ₹49.');
  end if;

  update public.creators
  set
    hype_count = hype_count + 1,
    total_hype_amount = total_hype_amount + p_amount
  where id = p_creator_id;

  update public.creator_hypes
  set
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = p_razorpay_signature,
    payment_status = 'captured',
    is_verified = true
  where id = p_payment_row_id;

  perform public.recalculate_creator_ranks();
  perform public.sync_live_battle();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.increment_creator_hype(uuid) to service_role;
grant execute on function public.increment_instagram_clicks(uuid) to service_role;

-- Creator profile images (public read, authenticated upload to own folder).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-images',
  'creator-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "creator images public read"
  on storage.objects for select
  using (bucket_id = 'creator-images');

drop policy if exists "authenticated upload creator images" on storage.objects;
create policy "authenticated upload creator images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'creator-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated update own creator images" on storage.objects;
create policy "authenticated update own creator images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'creator-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

select public.recalculate_creator_ranks();
select public.sync_live_battle();
