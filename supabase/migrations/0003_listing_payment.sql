-- Listing payment gate: creators are public only after ₹199 verified payment.

alter table public.creators
  add column if not exists listing_payment_status text not null default 'pending'
    check (listing_payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists published_at timestamptz;

-- Extend creator status values (keep legacy approved/featured for migration)
alter table public.creators drop constraint if exists creators_status_check;
alter table public.creators add constraint creators_status_check
  check (status in ('pending', 'pending_payment', 'active', 'approved', 'rejected', 'featured'));

-- Existing approved creators were listed without payment — treat as paid/active
update public.creators
set
  status = 'active',
  listing_payment_status = 'paid',
  published_at = coalesce(published_at, created_at)
where status = 'approved';

update public.creators
set status = 'active', listing_payment_status = 'paid', published_at = coalesce(published_at, created_at)
where status = 'featured';

alter table public.creators alter column status set default 'pending_payment';

create table if not exists public.creator_listing_payments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  payer_name text not null,
  payer_email text not null,
  amount numeric(12,2) not null check (amount >= 199),
  currency text not null default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'captured', 'failed')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists creator_listing_payments_creator_id_idx
  on public.creator_listing_payments (creator_id);

-- Replace public creator RLS
drop policy if exists "approved creators are public" on public.creators;
create policy "published creators are public" on public.creators
  for select using (
    (status = 'active' and listing_payment_status = 'paid')
    or user_id = auth.uid()
  );

alter table public.creator_listing_payments enable row level security;
revoke all on public.creator_listing_payments from anon, authenticated;

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

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.apply_verified_listing_payment(uuid, uuid, text, text) to service_role;

-- Rankings only count published creators
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
      and status = 'active'
      and listing_payment_status = 'paid'
  ) ranked
  where c.id = ranked.id;
end;
$$;
