-- Project Pilot Sprint 3.0B Revenue Launch
-- Best Match contractor marketplace, qualified introductions, payment records,
-- contractor verification, and production admin metrics.
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.contractor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  website text not null default '',
  description text not null default '',
  specialties text[] not null default '{}'::text[],
  service_counties text[] not null default '{}'::text[],
  service_zip_codes text[] not null default '{}'::text[],
  minimum_project_value integer not null default 0 check (minimum_project_value >= 0),
  maximum_project_value integer check (maximum_project_value is null or maximum_project_value >= minimum_project_value),
  availability text not null default 'Contact for availability',
  license_state text not null default '',
  license_number text not null default '',
  insurance_status text not null default 'Not submitted' check (insurance_status in ('Not submitted','Submitted','Verified','Expired')),
  verification_status text not null default 'Pending' check (verification_status in ('Pending','Verified','Rejected','Suspended')),
  active boolean not null default true,
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  response_rate numeric(5,2) not null default 0 check (response_rate >= 0 and response_rate <= 100),
  average_response_minutes integer,
  completed_projects integer not null default 0 check (completed_projects >= 0),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_requests (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_title text not null,
  project_type text not null default 'General Project',
  project_summary text not null,
  county text not null default '',
  zip_code text not null default '',
  budget_min integer not null default 0 check (budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= budget_min),
  desired_start text not null default '',
  status text not null default 'Open' check (status in ('Open','Matched','Hired','Closed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_contacts (
  lead_request_id uuid primary key references public.marketplace_lead_requests(id) on delete cascade,
  homeowner_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  project_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_matches (
  id uuid primary key default gen_random_uuid(),
  lead_request_id uuid not null references public.marketplace_lead_requests(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  match_score integer not null default 0 check (match_score >= 0 and match_score <= 100),
  match_reasons text[] not null default '{}'::text[],
  status text not null default 'Offered' check (status in ('Offered','Accepted','Declined','Expired','Closed')),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending','Paid','Waived','Credited','Refunded')),
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_request_id, contractor_id)
);

create table if not exists public.marketplace_lead_credits (
  id uuid primary key default gen_random_uuid(),
  lead_match_id uuid not null references public.marketplace_lead_matches(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'Requested' check (status in ('Requested','Reviewing','Approved','Denied','Issued')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.contractor_profiles enable row level security;
alter table public.marketplace_lead_requests enable row level security;
alter table public.marketplace_lead_contacts enable row level security;
alter table public.marketplace_lead_matches enable row level security;
alter table public.marketplace_lead_credits enable row level security;
alter table public.stripe_webhook_events enable row level security;


create or replace function public.is_marketplace_lead_owner(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.marketplace_lead_requests r
    where r.id = p_lead_request_id and r.homeowner_id = auth.uid()
  );
$$;

create or replace function public.is_marketplace_matched_contractor(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.marketplace_lead_matches m
    where m.lead_request_id = p_lead_request_id and m.contractor_id = auth.uid()
  );
$$;

create or replace function public.can_view_marketplace_contact(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_marketplace_lead_owner(p_lead_request_id)
    or public.is_project_pilot_admin()
    or exists (
      select 1 from public.marketplace_lead_matches m
      where m.lead_request_id = p_lead_request_id
        and m.contractor_id = auth.uid()
        and m.status = 'Accepted'
        and m.payment_status in ('Paid','Waived')
    );
$$;

revoke all on function public.is_marketplace_lead_owner(uuid) from public;
revoke all on function public.is_marketplace_matched_contractor(uuid) from public;
revoke all on function public.can_view_marketplace_contact(uuid) from public;
grant execute on function public.is_marketplace_lead_owner(uuid) to authenticated;
grant execute on function public.is_marketplace_matched_contractor(uuid) to authenticated;
grant execute on function public.can_view_marketplace_contact(uuid) to authenticated;

-- Contractor profiles

drop policy if exists "Contractors can view own profile" on public.contractor_profiles;
create policy "Contractors can view own profile"
on public.contractor_profiles for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin() or (active = true and verification_status = 'Verified'));

drop policy if exists "Contractors can create own profile" on public.contractor_profiles;
create policy "Contractors can create own profile"
on public.contractor_profiles for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Contractors can update own profile" on public.contractor_profiles;
create policy "Contractors can update own profile"
on public.contractor_profiles for update to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin())
with check (user_id = auth.uid() or public.is_project_pilot_admin());

-- Lead requests contain project details but no direct contact information.

drop policy if exists "Homeowners and matched contractors can view lead requests" on public.marketplace_lead_requests;
create policy "Homeowners and matched contractors can view lead requests"
on public.marketplace_lead_requests for select to authenticated
using (
  homeowner_id = auth.uid()
  or public.is_project_pilot_admin()
  or public.is_marketplace_matched_contractor(id)
);

drop policy if exists "Homeowners can update own lead requests" on public.marketplace_lead_requests;
create policy "Homeowners can update own lead requests"
on public.marketplace_lead_requests for update to authenticated
using (homeowner_id = auth.uid() or public.is_project_pilot_admin())
with check (homeowner_id = auth.uid() or public.is_project_pilot_admin());

-- Contact details are released only after a paid or waived acceptance.

drop policy if exists "Authorized users can view lead contacts" on public.marketplace_lead_contacts;
create policy "Authorized users can view lead contacts"
on public.marketplace_lead_contacts for select to authenticated
using (public.can_view_marketplace_contact(lead_request_id));

-- Lead matches are visible to the homeowner, matched contractor, or admin.

drop policy if exists "Lead participants can view matches" on public.marketplace_lead_matches;
create policy "Lead participants can view matches"
on public.marketplace_lead_matches for select to authenticated
using (
  contractor_id = auth.uid()
  or public.is_project_pilot_admin()
  or public.is_marketplace_lead_owner(lead_request_id)
);

-- Credits/disputes

drop policy if exists "Contractors can view own lead credits" on public.marketplace_lead_credits;
create policy "Contractors can view own lead credits"
on public.marketplace_lead_credits for select to authenticated
using (contractor_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Contractors can request lead credits" on public.marketplace_lead_credits;
create policy "Contractors can request lead credits"
on public.marketplace_lead_credits for insert to authenticated
with check (contractor_id = auth.uid());

drop policy if exists "Admins can update lead credits" on public.marketplace_lead_credits;
create policy "Admins can update lead credits"
on public.marketplace_lead_credits for update to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- No authenticated-user policies are created for stripe_webhook_events.
-- Server-side service-role access is required.

create index if not exists contractor_profiles_verification_idx on public.contractor_profiles(verification_status, active);
create index if not exists contractor_profiles_specialties_gin_idx on public.contractor_profiles using gin(specialties);
create index if not exists contractor_profiles_zip_codes_gin_idx on public.contractor_profiles using gin(service_zip_codes);
create index if not exists marketplace_lead_requests_homeowner_idx on public.marketplace_lead_requests(homeowner_id, created_at desc);
create index if not exists marketplace_lead_matches_contractor_idx on public.marketplace_lead_matches(contractor_id, status, created_at desc);
create index if not exists marketplace_lead_matches_payment_idx on public.marketplace_lead_matches(payment_status, created_at desc);

create or replace function public.project_pilot_lead_fee_cents(p_budget_max integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_budget_max, 0) <= 5000 then 2500
    when p_budget_max <= 15000 then 5000
    when p_budget_max <= 50000 then 10000
    else 15000
  end;
$$;

create or replace function public.calculate_marketplace_match(
  p_contractor_id uuid,
  p_project_type text,
  p_project_title text,
  p_project_description text,
  p_county text,
  p_zip_code text,
  p_budget_max integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cp public.contractor_profiles%rowtype;
  v_project_text text := lower(trim(concat_ws(' ', p_project_type, p_project_title, p_project_description)));
  v_county text := lower(trim(coalesce(p_county, '')));
  v_zip text := trim(coalesce(p_zip_code, ''));
  v_score integer := 35;
  v_reasons text[] := array['Verified Project Pilot contractor'];
  v_specialty text;
begin
  select * into cp
  from public.contractor_profiles
  where user_id = p_contractor_id
    and active = true
    and verification_status = 'Verified';

  if not found then raise exception 'Selected contractor is no longer available'; end if;

  select specialty into v_specialty
  from unnest(cp.specialties) specialty
  where length(trim(specialty)) > 0
    and (
      v_project_text like '%' || lower(trim(specialty)) || '%'
      or lower(trim(specialty)) like '%' || lower(trim(coalesce(p_project_type, ''))) || '%'
    )
  order by length(specialty) desc
  limit 1;

  if v_specialty is not null then
    v_score := v_score + 35;
    v_reasons := array_append(v_reasons, 'Specializes in ' || v_specialty);
  elsif cardinality(cp.specialties) > 0 then
    v_reasons := array_append(v_reasons, 'Offers related project services');
  end if;

  if v_zip <> '' and v_zip = any(cp.service_zip_codes) then
    v_score := v_score + 20;
    v_reasons := array_append(v_reasons, 'Serves ZIP code ' || v_zip);
  elsif v_county <> '' and exists (
    select 1 from unnest(cp.service_counties) service_county
    where v_county like '%' || lower(trim(service_county)) || '%'
       or lower(trim(service_county)) like '%' || v_county || '%'
  ) then
    v_score := v_score + 15;
    v_reasons := array_append(v_reasons, 'Serves the project county');
  end if;

  if coalesce(p_budget_max, 0) > 0
     and p_budget_max >= cp.minimum_project_value
     and (cp.maximum_project_value is null or p_budget_max <= cp.maximum_project_value) then
    v_score := v_score + 8;
    v_reasons := array_append(v_reasons, 'Project size fits their typical range');
  end if;

  if coalesce(cp.availability, '') <> '' and lower(cp.availability) not like '%paused%' then
    v_score := v_score + 5;
    v_reasons := array_append(v_reasons, cp.availability);
  end if;

  if cp.response_rate >= 80 then
    v_score := v_score + 4;
    v_reasons := array_append(v_reasons, 'Strong response history');
  end if;

  if cp.rating >= 4 then
    v_score := v_score + 3;
    v_reasons := array_append(v_reasons, 'Strong customer rating');
  end if;

  return jsonb_build_object(
    'score', least(99, greatest(50, v_score)),
    'reasons', to_jsonb(v_reasons[1:4])
  );
end;
$$;

revoke all on function public.calculate_marketplace_match(uuid,text,text,text,text,text,integer) from public;
grant execute on function public.calculate_marketplace_match(uuid,text,text,text,text,text,integer) to authenticated;

create or replace function public.create_marketplace_lead(
  p_project_id uuid,
  p_matches jsonb,
  p_project_summary text,
  p_county text,
  p_zip_code text,
  p_budget_min integer,
  p_budget_max integer,
  p_desired_start text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_project_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_request_id uuid;
  v_match jsonb;
  v_contractor_id uuid;
  v_match_count integer;
  v_calculated_match jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;

  select * into v_project
  from public.projects
  where id = p_project_id and user_id = v_user_id;

  if not found then raise exception 'Project not found'; end if;
  if coalesce(length(trim(p_project_summary)), 0) < 10 then raise exception 'Add a clearer project summary'; end if;
  if coalesce(length(trim(p_contact_name)), 0) = 0 or coalesce(length(trim(p_contact_email)), 0) = 0 then
    raise exception 'Contact name and email are required';
  end if;

  select jsonb_array_length(coalesce(p_matches, '[]'::jsonb)) into v_match_count;
  if v_match_count < 1 or v_match_count > 3 then
    raise exception 'Choose between one and three contractors';
  end if;

  insert into public.marketplace_lead_requests (
    homeowner_id, project_id, project_title, project_type, project_summary,
    county, zip_code, budget_min, budget_max, desired_start, status
  ) values (
    v_user_id, v_project.id, v_project.title, coalesce(nullif(v_project.project_type, ''), 'General Project'),
    trim(p_project_summary), trim(coalesce(p_county, '')), trim(coalesce(p_zip_code, '')),
    greatest(coalesce(p_budget_min, 0), 0), p_budget_max, trim(coalesce(p_desired_start, '')), 'Matched'
  ) returning id into v_request_id;

  insert into public.marketplace_lead_contacts (
    lead_request_id, homeowner_id, contact_name, contact_email, contact_phone, project_address
  ) values (
    v_request_id, v_user_id, trim(p_contact_name), lower(trim(p_contact_email)),
    trim(coalesce(p_contact_phone, '')), trim(coalesce(p_project_address, ''))
  );

  for v_match in select * from jsonb_array_elements(p_matches)
  loop
    v_contractor_id := (v_match ->> 'contractor_id')::uuid;

    v_calculated_match := public.calculate_marketplace_match(
      v_contractor_id,
      v_project.project_type,
      v_project.title,
      v_project.description,
      p_county,
      p_zip_code,
      p_budget_max
    );

    insert into public.marketplace_lead_matches (
      lead_request_id, contractor_id, match_score, match_reasons, fee_cents
    ) values (
      v_request_id,
      v_contractor_id,
      (v_calculated_match ->> 'score')::integer,
      coalesce(array(select jsonb_array_elements_text(v_calculated_match -> 'reasons')), '{}'::text[]),
      public.project_pilot_lead_fee_cents(p_budget_max)
    )
    on conflict (lead_request_id, contractor_id) do nothing;
  end loop;

  return v_request_id;
end;
$$;

revoke all on function public.create_marketplace_lead(uuid,jsonb,text,text,text,integer,integer,text,text,text,text,text) from public;
grant execute on function public.create_marketplace_lead(uuid,jsonb,text,text,text,integer,integer,text,text,text,text,text) to authenticated;

create or replace function public.decline_marketplace_lead(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_lead_matches
  set status = 'Declined', declined_at = now(), updated_at = now()
  where id = p_match_id and contractor_id = auth.uid() and status = 'Offered';

  if not found then raise exception 'Lead could not be declined'; end if;
end;
$$;

revoke all on function public.decline_marketplace_lead(uuid) from public;
grant execute on function public.decline_marketplace_lead(uuid) to authenticated;

create or replace function public.request_marketplace_lead_credit(p_match_id uuid, p_reason text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_credit_id uuid;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(length(trim(p_reason)),0) < 3 then raise exception 'Add a reason for the lead review'; end if;

  if not exists (
    select 1 from public.marketplace_lead_matches m
    where m.id = p_match_id
      and m.contractor_id = v_user_id
      and m.status = 'Accepted'
      and m.payment_status in ('Paid','Waived')
  ) then
    raise exception 'Only accepted introductions can be reviewed';
  end if;

  if exists (
    select 1 from public.marketplace_lead_credits c
    where c.lead_match_id = p_match_id and c.contractor_id = v_user_id
      and c.status in ('Requested','Reviewing','Approved','Issued')
  ) then
    raise exception 'A lead review already exists for this introduction';
  end if;

  insert into public.marketplace_lead_credits (lead_match_id, contractor_id, reason, details, status)
  values (p_match_id, v_user_id, trim(p_reason), trim(coalesce(p_details,'')), 'Requested')
  returning id into v_credit_id;

  return v_credit_id;
end;
$$;

revoke all on function public.request_marketplace_lead_credit(uuid,text,text) from public;
grant execute on function public.request_marketplace_lead_credit(uuid,text,text) to authenticated;

create or replace function public.admin_set_lead_credit_status(p_credit_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Requested','Reviewing','Approved','Denied','Issued') then raise exception 'Invalid lead review status'; end if;

  update public.marketplace_lead_credits
  set status = p_status, updated_at = now()
  where id = p_credit_id;
end;
$$;

revoke all on function public.admin_set_lead_credit_status(uuid,text) from public;
grant execute on function public.admin_set_lead_credit_status(uuid,text) to authenticated;

create or replace function public.admin_set_contractor_verification(p_contractor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Pending','Verified','Rejected','Suspended') then raise exception 'Invalid verification status'; end if;

  update public.contractor_profiles
  set verification_status = p_status, updated_at = now()
  where user_id = p_contractor_id;
end;
$$;

revoke all on function public.admin_set_contractor_verification(uuid,text) from public;
grant execute on function public.admin_set_contractor_verification(uuid,text) to authenticated;

create or replace function public.admin_set_contractor_insurance(p_contractor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Not submitted','Submitted','Verified','Expired') then raise exception 'Invalid insurance status'; end if;

  update public.contractor_profiles
  set insurance_status = p_status, updated_at = now()
  where user_id = p_contractor_id;
end;
$$;

revoke all on function public.admin_set_contractor_insurance(uuid,text) from public;
grant execute on function public.admin_set_contractor_insurance(uuid,text) to authenticated;

create or replace function public.admin_marketplace_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;

  select jsonb_build_object(
    'contractor_profiles', (select count(*) from public.contractor_profiles),
    'verified_contractors', (select count(*) from public.contractor_profiles where verification_status = 'Verified' and active = true),
    'pending_contractors', (select count(*) from public.contractor_profiles where verification_status = 'Pending'),
    'lead_requests', (select count(*) from public.marketplace_lead_requests),
    'open_leads', (select count(*) from public.marketplace_lead_requests where status in ('Open','Matched')),
    'lead_offers', (select count(*) from public.marketplace_lead_matches),
    'accepted_leads', (select count(*) from public.marketplace_lead_matches where status = 'Accepted'),
    'paid_leads', (select count(*) from public.marketplace_lead_matches where payment_status = 'Paid'),
    'actual_revenue_cents', (select coalesce(sum(paid_amount_cents),0) from public.marketplace_lead_matches where payment_status = 'Paid'),
    'pending_fee_value_cents', (select coalesce(sum(fee_cents),0) from public.marketplace_lead_matches where status = 'Offered' and payment_status = 'Unpaid'),
    'credit_requests', (select count(*) from public.marketplace_lead_credits where status in ('Requested','Reviewing'))
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_marketplace_summary() from public;
grant execute on function public.admin_marketplace_summary() to authenticated;

comment on table public.contractor_profiles is 'Verified contractor partner profiles used for unbiased Best Match recommendations.';
comment on table public.marketplace_lead_matches is 'Qualified introduction offers. Payment does not affect Best Match ranking.';

-- Repair profile rows and ensure one administrator exists for the owner account.
insert into public.profiles (id, full_name, role, created_at, updated_at)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email,''), '@', 1), 'Project Pilot User'),
  coalesce(u.raw_user_meta_data ->> 'role', 'Homeowner'),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do nothing;

do $$
declare
  v_admin_exists boolean;
  v_owner_id uuid;
begin
  select exists(select 1 from public.profiles where is_admin = true) into v_admin_exists;
  if not v_admin_exists then
    select id into v_owner_id from auth.users order by created_at asc limit 1;
    if v_owner_id is not null then
      update public.profiles set is_admin = true, updated_at = now() where id = v_owner_id;
    end if;
  end if;
end $$;

-- Protect contractor private details from marketplace browsing.
-- Homeowners use a safe public view; contractors and admins use security-definer RPCs.
drop view if exists public.contractor_public_profiles;
create view public.contractor_public_profiles
with (security_barrier = true)
as
select
  user_id,
  business_name,
  description,
  specialties,
  service_counties,
  service_zip_codes,
  minimum_project_value,
  maximum_project_value,
  availability,
  verification_status,
  active,
  rating,
  review_count,
  response_rate,
  average_response_minutes,
  completed_projects,
  created_at,
  updated_at
from public.contractor_profiles
where active = true and verification_status = 'Verified';

grant select on public.contractor_public_profiles to authenticated, anon;


create or replace function public.list_public_contractors()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', cp.user_id,
        'business_name', cp.business_name,
        'description', cp.description,
        'specialties', cp.specialties,
        'service_counties', cp.service_counties,
        'service_zip_codes', cp.service_zip_codes,
        'minimum_project_value', cp.minimum_project_value,
        'maximum_project_value', cp.maximum_project_value,
        'availability', cp.availability,
        'verification_status', cp.verification_status,
        'active', cp.active,
        'rating', cp.rating,
        'review_count', cp.review_count,
        'response_rate', cp.response_rate,
        'average_response_minutes', cp.average_response_minutes,
        'completed_projects', cp.completed_projects,
        'created_at', cp.created_at,
        'updated_at', cp.updated_at
      ) order by cp.rating desc, cp.completed_projects desc, cp.updated_at desc
    ),
    '[]'::jsonb
  )
  from public.contractor_profiles cp
  where cp.active = true and cp.verification_status = 'Verified';
$$;

revoke all on function public.list_public_contractors() from public;
grant execute on function public.list_public_contractors() to authenticated, anon;

create or replace function public.get_my_marketplace_requests()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'project_id', r.project_id,
        'project_title', r.project_title,
        'project_type', r.project_type,
        'project_summary', r.project_summary,
        'county', r.county,
        'zip_code', r.zip_code,
        'budget_min', r.budget_min,
        'budget_max', r.budget_max,
        'desired_start', r.desired_start,
        'status', r.status,
        'created_at', r.created_at,
        'matches', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'contractor_id', m.contractor_id,
              'business_name', cp.business_name,
              'match_score', m.match_score,
              'status', m.status,
              'payment_status', m.payment_status,
              'accepted_at', m.accepted_at
            ) order by m.match_score desc, m.offered_at asc
          )
          from public.marketplace_lead_matches m
          left join public.contractor_profiles cp on cp.user_id = m.contractor_id
          where m.lead_request_id = r.id
        ), '[]'::jsonb)
      ) order by r.created_at desc
    ),
    '[]'::jsonb
  )
  from public.marketplace_lead_requests r
  where r.homeowner_id = auth.uid();
$$;

revoke all on function public.get_my_marketplace_requests() from public;
grant execute on function public.get_my_marketplace_requests() to authenticated;

create or replace function public.get_my_contractor_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(cp)
  from public.contractor_profiles cp
  where cp.user_id = auth.uid();
$$;

revoke all on function public.get_my_contractor_profile() from public;
grant execute on function public.get_my_contractor_profile() to authenticated;

create or replace function public.save_my_contractor_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(length(trim(p_profile ->> 'business_name')),0) = 0 then raise exception 'Business name is required'; end if;
  if coalesce(length(trim(p_profile ->> 'phone')),0) = 0 then raise exception 'Phone number is required'; end if;
  if coalesce(jsonb_array_length(coalesce(p_profile -> 'specialties','[]'::jsonb)),0) = 0 then raise exception 'Choose at least one specialty'; end if;
  if coalesce(jsonb_array_length(coalesce(p_profile -> 'service_counties','[]'::jsonb)),0) = 0 then raise exception 'Choose at least one service county'; end if;
  if nullif(p_profile ->> 'terms_accepted_at','') is null then raise exception 'Contractor partner terms must be accepted'; end if;

  insert into public.contractor_profiles as current_profile (
    user_id, business_name, contact_name, phone, website, description,
    specialties, service_counties, service_zip_codes,
    minimum_project_value, maximum_project_value, availability,
    license_state, license_number, insurance_status, active, terms_accepted_at, updated_at
  ) values (
    v_user_id,
    trim(p_profile ->> 'business_name'),
    trim(coalesce(p_profile ->> 'contact_name','')),
    trim(p_profile ->> 'phone'),
    trim(coalesce(p_profile ->> 'website','')),
    trim(coalesce(p_profile ->> 'description','')),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'specialties','[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'service_counties','[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'service_zip_codes','[]'::jsonb))), '{}'::text[]),
    greatest(coalesce((p_profile ->> 'minimum_project_value')::integer,0),0),
    nullif(p_profile ->> 'maximum_project_value','')::integer,
    trim(coalesce(p_profile ->> 'availability','Contact for availability')),
    upper(trim(coalesce(p_profile ->> 'license_state',''))),
    trim(coalesce(p_profile ->> 'license_number','')),
    case when p_profile ->> 'insurance_status' in ('Not submitted','Submitted') then p_profile ->> 'insurance_status' else 'Not submitted' end,
    coalesce((p_profile ->> 'active')::boolean,true),
    (p_profile ->> 'terms_accepted_at')::timestamptz,
    now()
  )
  on conflict (user_id) do update set
    business_name = excluded.business_name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    website = excluded.website,
    description = excluded.description,
    specialties = excluded.specialties,
    service_counties = excluded.service_counties,
    service_zip_codes = excluded.service_zip_codes,
    minimum_project_value = excluded.minimum_project_value,
    maximum_project_value = excluded.maximum_project_value,
    availability = excluded.availability,
    license_state = excluded.license_state,
    license_number = excluded.license_number,
    insurance_status = case
      when p_profile ->> 'insurance_status' in ('Not submitted','Submitted') then excluded.insurance_status
      else current_profile.insurance_status
    end,
    verification_status = case
      when current_profile.license_state is distinct from excluded.license_state
        or current_profile.license_number is distinct from excluded.license_number
        or (p_profile ->> 'insurance_status' in ('Not submitted','Submitted') and current_profile.insurance_status is distinct from excluded.insurance_status)
      then 'Pending'
      else current_profile.verification_status
    end,
    active = excluded.active,
    terms_accepted_at = excluded.terms_accepted_at,
    updated_at = now();

  update public.profiles set role = 'Contractor', updated_at = now() where id = v_user_id;
  select to_jsonb(cp) into v_result from public.contractor_profiles cp where cp.user_id = v_user_id;
  return v_result;
end;
$$;

revoke all on function public.save_my_contractor_profile(jsonb) from public;
grant execute on function public.save_my_contractor_profile(jsonb) to authenticated;

create or replace function public.admin_contractor_directory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(to_jsonb(cp) order by cp.created_at desc), '[]'::jsonb)
  into result from public.contractor_profiles cp;
  return result;
end;
$$;

revoke all on function public.admin_contractor_directory() from public;
grant execute on function public.admin_contractor_directory() to authenticated;

-- Explicit API privileges. Row-level security still determines which rows each user can access.
grant select on public.marketplace_lead_requests to authenticated;
grant select on public.marketplace_lead_contacts to authenticated;
grant select on public.marketplace_lead_matches to authenticated;
grant select on public.marketplace_lead_credits to authenticated;
revoke insert, update, delete on public.marketplace_lead_requests from authenticated;
revoke insert, update, delete on public.marketplace_lead_matches from authenticated;
revoke insert, update, delete on public.marketplace_lead_contacts from authenticated;
revoke insert, update, delete on public.marketplace_lead_credits from authenticated;
grant select on public.contractor_public_profiles to authenticated, anon;

-- Direct contractor-table access is blocked. Safe reads and writes use the RPCs above.
revoke all on public.contractor_profiles from authenticated;
