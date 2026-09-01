-- Restore auto-publish after verified listing payment (reverts 0004 review-queue if applied).

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
