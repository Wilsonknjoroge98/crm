-- Unified Leads -> Clients -> Policies read model ("business" domain).
--
-- This is a regular view, so changes to the source tables are visible
-- immediately. Run this script manually in Supabase. It is cumulative and
-- idempotent: a single run brings a fresh database fully up to date, and
-- re-running it is always safe.

begin;

-- Lead columns the view depends on. A single premium is stored in
-- leads.premium with these bounds null; a range such as "50 - 75" is stored
-- as premium_min/premium_max with leads.premium null. availability holds
-- free-text contact-window notes from GSQ ingestion.
alter table public.leads
  add column if not exists premium_min numeric,
  add column if not exists premium_max numeric,
  add column if not exists availability text;

-- Inline card notes autosave against whichever record the person currently
-- is: the client row after conversion, the lead row before it.
alter table public.leads
  add column if not exists notes text;
alter table public.clients
  add column if not exists notes text;

-- One-time carry-over: agent_clients.agent_notes was the only place client
-- notes lived before this column existed. Every client has exactly one
-- agent_clients row in practice, so this is lossless. Only backfills rows
-- this script hasn't already touched, so re-running is a no-op.
update public.clients c
set notes = ac.agent_notes
from public.agent_clients ac
where ac.client_id = c.id
  and c.notes is null
  and ac.agent_notes is not null;

-- "Notify me when this is available" signups from the disabled quick-action
-- buttons (Call / Text / Disposition / Appointment).
create table if not exists public.release_notifications_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  feature text not null default 'business_quick_actions',
  agent_id uuid,
  created_at timestamptz not null default now(),
  unique (email, feature)
);

revoke all on public.release_notifications_subscribers from anon;
revoke all on public.release_notifications_subscribers from authenticated;
grant all on public.release_notifications_subscribers to service_role;

-- The people name is retired in favor of business; the view must be dropped
-- (not replaced) because it selects the search columns rebuilt below.
drop view if exists public.people;
drop view if exists public.business;

-- Search is substring-based (ilike '%term%'), which trigram indexes serve
-- and tsvector cannot. Full-text leftovers have no callers.
drop index if exists leads_people_search_vector_idx;
drop index if exists clients_people_search_vector_idx;
drop index if exists leads_email_trgm_idx;
drop index if exists clients_email_trgm_idx;
alter table public.leads drop column if exists people_search_vector;
alter table public.clients drop column if exists people_search_vector;

-- Search columns live on the source tables because regular PostgreSQL views
-- cannot be indexed directly. The concatenation covers "first last" (which
-- also contains each name alone), "firstlast" for queries spanning the name
-- boundary, email, and a digits-only phone.
alter table public.leads
  add column if not exists people_search_text text
  generated always as (
    lower(
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(first_name, '') || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
    )
  ) stored;

alter table public.clients
  add column if not exists people_search_text text
  generated always as (
    lower(
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(first_name, '') || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
    )
  ) stored;

create extension if not exists pg_trgm;

create index if not exists leads_people_search_text_idx
  on public.leads using gin (people_search_text gin_trgm_ops);

create index if not exists clients_people_search_text_idx
  on public.clients using gin (people_search_text gin_trgm_ops);

create view public.business
with (security_invoker = true)
as
select
  -- A lead can produce multiple client sales (for example, family members).
  -- Use the client ID for sales so every joined row has a unique DataGrid ID,
  -- and fall back to the lead ID while the person is still only a lead.
  coalesce(c.id, l.id) as id,
  l.id as lead_id,
  c.id as client_id,
  case when c.id is null then 'LEAD' else 'SALE' end as lifecycle_status,

  -- Client identity is authoritative after conversion; otherwise use the lead.
  coalesce(c.first_name, l.first_name) as first_name,
  coalesce(c.last_name, l.last_name) as last_name,
  coalesce(c.email, l.email) as email,
  coalesce(c.phone, l.phone) as phone,
  coalesce(c.date_of_birth, l.date_of_birth) as date_of_birth,
  coalesce(c.state, l.state) as state,

  -- Client/profile fields.
  c.address,
  c.city,
  c.zip,
  c.occupation,
  c.marital_status,
  c.annual_income,

  -- Lead/underwriting fields.
  l.agent_id,
  l.sold,
  l.verified,
  l.smoker,
  l.height_feet,
  l.height_inches,
  l.weight_lbs,
  l.cholesterol_medication,
  l.blood_pressure_medication,
  l.face_amount,
  l.premium,
  l.selected_plan,
  l.selected_carrier,
  l.beneficiary,
  l.priority,
  l.why,
  l.gsq_source,
  l.gsq_id,
  l.gsq_live_transfer,
  l.lead_vendor_id,
  lv.name as lead_vendor_name,

  coalesce(c.notes, l.notes) as notes,

  l.created_at as lead_created_at,
  c.created_at as client_created_at,
  -- Display fields are client-authoritative after conversion.
  coalesce(c.created_at, l.created_at) as created_at,
  greatest(l.updated_at, c.updated_at) as updated_at,

  -- Exposed for convenience. To guarantee use of the two GIN indexes, the API
  -- searches the source-table columns first and then filters this view by ID.
  coalesce(l.people_search_text, '') || ' ' ||
    coalesce(c.people_search_text, '') as search_text,

  coalesce(policy_rollup.policies, '[]'::json) as policies,

  l.premium_min,
  l.premium_max,
  l.availability
from public.leads l
full outer join public.clients c
  on c.lead_id = l.id
left join public.lead_vendors lv
  on lv.id = l.lead_vendor_id
left join lateral (
  select json_agg(
    to_jsonb(p) ||
      jsonb_build_object(
        'carrier_name', carrier.name,
        'product_name', product.name,
        'beneficiaries', coalesce(
          (
            select json_agg(
              json_build_object(
                'id', b.id,
                'first_name', b.first_name,
                'last_name', b.last_name,
                'relationship', b.relationship,
                'allocation_percent', b.allocation_percent,
                'beneficiary_type', b.beneficiary_type,
                'phone', b.phone
              )
              order by
                case when b.beneficiary_type = 'primary' then 0 else 1 end,
                b.id
            )
            from public.beneficiaries b
            where b.policy_id = p.id
          ),
          '[]'::json
        )
      )
    order by p.created_at desc
  ) as policies
  from public.policies p
  left join public.carriers carrier
    on carrier.id = p.carrier_id
  left join public.products product
    on product.id = p.product_id
  where p.client_id = c.id
) policy_rollup on true;

comment on view public.business is
  'Unified lead/client identity with policies aggregated as JSON.';

revoke all on public.business from anon;
grant select on public.business to authenticated;
grant select on public.business to service_role;

commit;
