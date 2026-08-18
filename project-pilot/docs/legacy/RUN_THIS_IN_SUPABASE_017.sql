-- Project Pilot 4.0 Launch Revenue
-- Adds paid Full-Service Permit Concierge orders while preserving free planning
-- and the existing contractor-introduction marketplace.
-- Run after migrations 015 and 016.

create extension if not exists "pgcrypto";

alter table public.permit_concierge_requests
  add column if not exists payment_status text not null default 'waived',
  add column if not exists service_fee_cents integer not null default 0,
  add column if not exists revenue_order_id uuid,
  add column if not exists paid_at timestamptz;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_payment_status_check
    check (payment_status in ('pending','paid','waived','refunded','cancelled'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_service_fee_nonnegative_check
    check (service_fee_cents >= 0);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.permit_service_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_code text not null default 'full_service_permit_coordination',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled','waived')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists permit_service_orders_checkout_uidx
  on public.permit_service_orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index if not exists permit_service_orders_request_idx
  on public.permit_service_orders(request_id, created_at desc);
create index if not exists permit_service_orders_user_idx
  on public.permit_service_orders(user_id, created_at desc);
create index if not exists permit_service_orders_status_idx
  on public.permit_service_orders(status, created_at desc);

-- Add the relationship after the table exists. Existing beta/full-service requests
-- remain "waived" so prior cases are never unexpectedly charged.
do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_revenue_order_fk
    foreign key (revenue_order_id) references public.permit_service_orders(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

alter table public.permit_service_orders enable row level security;

drop policy if exists "Owners can view permit service orders" on public.permit_service_orders;
create policy "Owners can view permit service orders"
on public.permit_service_orders for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit service orders" on public.permit_service_orders;
create policy "Admins can manage permit service orders"
on public.permit_service_orders for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

grant select on public.permit_service_orders to authenticated;

create or replace function public.touch_permit_service_order_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_service_orders_touch on public.permit_service_orders;
create trigger permit_service_orders_touch
before update on public.permit_service_orders
for each row execute function public.touch_permit_service_order_updated_at();

comment on table public.permit_service_orders is
'One-time Project Pilot Full-Service Permit Concierge coordination purchases. Government permit fees, licensed-professional services, design/engineering work, and third-party charges are separate unless explicitly included.';
