-- Project Pilot 4.1 — simple loyalty and referral loop
-- Give $10, Get $10: referred user gets a $10 Permit Concierge credit at claim;
-- referrer earns a $10 credit after the referred user's first paid Concierge order.


-- Normalize only unpaid pre-4.1 Concierge requests to the new $99 base offer.
-- Paid/refunded historical orders keep their original recorded amounts.
update public.permit_concierge_requests
set service_fee_cents = 9900, updated_at = now()
where payment_status in ('pending','cancelled')
  and service_started_at is null
  and coalesce(service_fee_cents, 0) <> 9900;

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'signed_up' check (status in ('signed_up','qualified','rewarded','reversed')),
  qualified_order_id uuid references public.permit_service_orders(id) on delete set null,
  referred_credit_cents integer not null default 1000 check (referred_credit_cents >= 0),
  referrer_reward_cents integer not null default 1000 check (referrer_reward_cents >= 0),
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  reversed_at timestamptz,
  check (referred_user_id <> referrer_user_id)
);

create index if not exists referral_attributions_referrer_idx
  on public.referral_attributions(referrer_user_id, created_at desc);

create table if not exists public.permit_service_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  reason text not null,
  idempotency_key text not null unique,
  related_user_id uuid references auth.users(id) on delete set null,
  related_order_id uuid references public.permit_service_orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists permit_service_credit_ledger_user_idx
  on public.permit_service_credit_ledger(user_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.permit_service_credit_ledger enable row level security;

drop policy if exists "Users can view their referral code" on public.referral_codes;
create policy "Users can view their referral code"
on public.referral_codes for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Users can view their referral activity" on public.referral_attributions;
create policy "Users can view their referral activity"
on public.referral_attributions for select to authenticated
using (referred_user_id = auth.uid() or referrer_user_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Users can view their Project Pilot credits" on public.permit_service_credit_ledger;
create policy "Users can view their Project Pilot credits"
on public.permit_service_credit_ledger for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin());

grant select on public.referral_codes to authenticated;
grant select on public.referral_attributions to authenticated;
grant select on public.permit_service_credit_ledger to authenticated;

comment on table public.referral_codes is 'Stable share codes used by the Project Pilot Give $10, Get $10 referral program.';
comment on table public.referral_attributions is 'One referrer per referred Project Pilot account. Rewards qualify after the referred user completes a paid Permit Concierge order.';
comment on table public.permit_service_credit_ledger is 'Append-only Project Pilot credit ledger. Positive amounts earn credit; negative amounts apply credit to Permit Concierge.';
