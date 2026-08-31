-- ViralRank.buzz schema, constraints, ranking functions, and RLS.
create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  instagram_username text not null unique,
  instagram_url text not null,
  name text not null,
  bio text,
  profile_image_url text,
  category_id uuid references public.categories (id),
  location text not null,
  contact_email text not null,
  contact_phone text,
  followers integer,
  average_views integer,
  instagram_data_source text not null default 'creator_provided'
    check (instagram_data_source in ('instagram', 'creator_provided', 'unavailable')),
  current_highest_bid numeric(12,2) not null default 0,
  current_rank integer,
  rank_set_at timestamptz,
  profile_clicks integer not null default 0,
  hype_count integer not null default 0,
  total_hype_amount numeric(12,2) not null default 0,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected', 'featured')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creators_current_highest_bid_idx
  on public.creators (current_highest_bid desc);
create index if not exists creators_category_id_idx
  on public.creators (category_id);
create index if not exists creators_status_idx
  on public.creators (status);

create table if not exists public.creator_ranking_bids (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  supporter_user_id uuid references auth.users (id) on delete set null,
  supporter_name text not null,
  supporter_email text not null,
  amount numeric(12,2) not null check (amount >= 199),
  currency text not null default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  payment_status text not null default 'created'
    check (payment_status in ('created', 'pending', 'captured', 'failed')),
  is_verified boolean not null default false,
  applied_to_rank boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ranking_bids_creator_id_idx
  on public.creator_ranking_bids (creator_id);
create index if not exists ranking_bids_verified_idx
  on public.creator_ranking_bids (is_verified, created_at);

create table if not exists public.creator_hypes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  supporter_user_id uuid references auth.users (id) on delete set null,
  supporter_name text not null,
  supporter_email text not null,
  amount numeric(12,2) not null check (amount >= 49),
  currency text not null default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  payment_status text not null default 'created'
    check (payment_status in ('created', 'pending', 'captured', 'failed')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists hypes_creator_id_idx
  on public.creator_hypes (creator_id);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  creator_one_id uuid not null references public.creators (id) on delete cascade,
  creator_two_id uuid not null references public.creators (id) on delete cascade,
  creator_one_bid numeric(12,2) not null default 0,
  creator_two_bid numeric(12,2) not null default 0,
  winner_id uuid references public.creators (id) on delete set null,
  status text not null default 'live'
    check (status in ('live', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rank_history (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  rank integer,
  highest_bid numeric(12,2) not null,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug) values
  ('Fashion', 'fashion'),
  ('Beauty', 'beauty'),
  ('Fitness', 'fitness'),
  ('Lifestyle', 'lifestyle'),
  ('Food', 'food'),
  ('Travel', 'travel'),
  ('Technology', 'technology'),
  ('Tech', 'tech'),
  ('Gaming', 'gaming'),
  ('Education', 'education'),
  ('Finance', 'finance'),
  ('Comedy', 'comedy'),
  ('Memes', 'memes'),
  ('Videos', 'videos'),
  ('Music', 'music'),
  ('Art', 'art'),
  ('Photography', 'photography'),
  ('Business', 'business'),
  ('Digital Marketing', 'digital-marketing'),
  ('Sports', 'sports'),
  ('Entertainment', 'entertainment'),
  ('Health', 'health'),
  ('Other', 'other')
on conflict (slug) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creators_set_updated_at on public.creators;
create trigger creators_set_updated_at
before update on public.creators
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
      new.hype_count := 0;
      new.total_hype_amount := 0;
      return new;
    end if;

    if new.current_rank is distinct from old.current_rank
      or new.current_highest_bid is distinct from old.current_highest_bid
      or new.profile_clicks is distinct from old.profile_clicks
      or new.hype_count is distinct from old.hype_count
      or new.total_hype_amount is distinct from old.total_hype_amount
      or new.rank_set_at is distinct from old.rank_set_at
    then
      raise exception 'Protected ranking fields cannot be written by clients';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_creator_ranking_fields on public.creators;
create trigger protect_creator_ranking_fields
before insert or update on public.creators
for each row execute function public.protect_ranking_columns();

create or replace function public.protect_payment_columns()
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
      new.payment_status := 'created';
      new.is_verified := false;
      new.razorpay_payment_id := null;
      new.razorpay_signature := null;
      return new;
    end if;

    if new.payment_status is distinct from old.payment_status
      or new.is_verified is distinct from old.is_verified
      or new.razorpay_payment_id is distinct from old.razorpay_payment_id
      or new.razorpay_signature is distinct from old.razorpay_signature
    then
      raise exception 'Protected payment fields cannot be written by clients';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_ranking_bid_fields on public.creator_ranking_bids;
create trigger protect_ranking_bid_fields
before insert or update on public.creator_ranking_bids
for each row execute function public.protect_payment_columns();

drop trigger if exists protect_hype_fields on public.creator_hypes;
create trigger protect_hype_fields
before insert or update on public.creator_hypes
for each row execute function public.protect_payment_columns();

create or replace function public.recalculate_creator_ranks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
  set current_rank = null
  where current_highest_bid <= 0;

  update public.creators c
  set current_rank = ranked.rank
  from (
    select
      id,
      rank() over (
        order by current_highest_bid desc, coalesce(rank_set_at, created_at) asc
      ) as rank
    from public.creators
    where current_highest_bid > 0
      and status = 'approved'
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
    when one.current_highest_bid > two.current_highest_bid then one.id
    when two.current_highest_bid > one.current_highest_bid then two.id
    when coalesce(one.rank_set_at, one.created_at) <= coalesce(two.rank_set_at, two.created_at) then one.id
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
      one.id, two.id, one.current_highest_bid, two.current_highest_bid, new_winner, 'live'
    );
  else
    update public.battles
    set
      creator_one_bid = one.current_highest_bid,
      creator_two_bid = two.current_highest_bid,
      winner_id = new_winner
    where id = live_row.id;
  end if;
end;
$$;

create or replace function public.apply_verified_ranking_bid(
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
declare
  v_current numeric;
  v_row public.creators%rowtype;
begin
  select * into v_row from public.creators where id = p_creator_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Creator not found.');
  end if;

  v_current := v_row.current_highest_bid;

  if v_current <= 0 and p_amount < 199 then
    return jsonb_build_object('ok', false, 'error', 'Minimum ranking bid is ₹199.');
  end if;

  if v_current > 0 and p_amount < v_current + 100 then
    return jsonb_build_object(
      'ok', false,
      'error', format('Your bid must be at least ₹%s to take this rank.', v_current + 100)
    );
  end if;

  update public.creators
  set
    current_highest_bid = p_amount,
    rank_set_at = now()
  where id = p_creator_id
    and current_highest_bid < p_amount;

  if not found then
    update public.creator_ranking_bids
    set
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      payment_status = 'captured',
      is_verified = true,
      applied_to_rank = false
    where id = p_payment_row_id;

    return jsonb_build_object(
      'ok', false,
      'error', 'We couldn''t verify this payment. Your ranking has not been updated.'
    );
  end if;

  update public.creator_ranking_bids
  set
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = p_razorpay_signature,
    payment_status = 'captured',
    is_verified = true,
    applied_to_rank = true
  where id = p_payment_row_id;

  perform public.recalculate_creator_ranks();
  perform public.sync_live_battle();

  insert into public.rank_history (creator_id, rank, highest_bid)
  select id, current_rank, current_highest_bid
  from public.creators
  where id = p_creator_id;

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

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.increment_profile_clicks(p_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creators
  set profile_clicks = profile_clicks + 1
  where id = p_creator_id;
end;
$$;

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.creator_ranking_bids enable row level security;
alter table public.creator_hypes enable row level security;
alter table public.battles enable row level security;
alter table public.rank_history enable row level security;

create policy "categories are public" on public.categories
  for select using (true);

create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

create policy "approved creators are public" on public.creators
  for select using (status = 'approved' or user_id = auth.uid());

create policy "verified ranking bids public amounts" on public.creator_ranking_bids
  for select using (is_verified = true);

create policy "verified hypes public amounts" on public.creator_hypes
  for select using (is_verified = true);

create policy "battles are public" on public.battles
  for select using (true);

create policy "rank history public" on public.rank_history
  for select using (true);

revoke insert, update, delete on public.creators from anon, authenticated;
revoke insert, update, delete on public.creator_ranking_bids from anon, authenticated;
revoke insert, update, delete on public.creator_hypes from anon, authenticated;
revoke insert, update, delete on public.battles from anon, authenticated;
revoke insert, update, delete on public.rank_history from anon, authenticated;
revoke insert, update, delete on public.categories from anon, authenticated;
revoke update, delete on public.profiles from anon, authenticated;

grant select on public.categories, public.creators, public.creator_ranking_bids,
  public.creator_hypes, public.battles, public.rank_history to anon, authenticated;
grant select on public.profiles to authenticated;

grant execute on function public.recalculate_creator_ranks() to service_role;
grant execute on function public.apply_verified_ranking_bid(uuid, numeric, uuid, text, text) to service_role;
grant execute on function public.apply_verified_hype(uuid, numeric, uuid, text, text) to service_role;
grant execute on function public.increment_profile_clicks(uuid) to service_role;
grant execute on function public.sync_live_battle() to service_role;
