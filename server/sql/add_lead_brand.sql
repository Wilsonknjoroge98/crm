-- Phase 1 of 2. Run BEFORE deploying the crm functions that write leads.brand.
--
-- leads.brand: which of our own brands produced the lead ('gsq' or 'keyley').
-- A lead with a brand is a house lead: it can't be deleted, it counts under
-- House Leads, and it gets Hyros attribution, live-transfer detection, the
-- brand's Meta pixel and the sold sync back to gsq.
-- lead_vendor_id stays, but only for leads an agent brought in themselves
-- (Self Generated, Referral, other vendors). A new brand no longer needs a
-- lead_vendors row.
--
-- Additive only: the functions deployed today look up the GetSeniorQuotes.com
-- vendor row and still write lead_vendor_id, and this keeps working for them.
-- add_lead_brand_cleanup.sql (phase 2, after the deploy) clears the GSQ vendor
-- off house leads and deletes that row. Safe to re-run.

begin;

alter table public.leads
  add column if not exists brand text;

alter table public.leads
  drop constraint if exists leads_brand_check,
  add constraint leads_brand_check
    check (brand is null or brand in ('gsq', 'keyley'));

-- Every lead that came through gsq so far (funnel, instant forms, the
-- marketplace) carries the GetSeniorQuotes.com vendor.
update public.leads
set brand = 'gsq'
where brand is null
  and lead_vendor_id = (
    select id from public.lead_vendors where name = 'GetSeniorQuotes.com'
  );

-- House leads no longer need a vendor. Every lead needs one source or the other.
alter table public.leads
  alter column lead_vendor_id drop not null;

alter table public.leads
  drop constraint if exists leads_source_check,
  add constraint leads_source_check
    check (brand is not null or lead_vendor_id is not null);

-- House Leads filters (business list, metrics, team summary, leaderboard).
create index if not exists leads_brand_idx
  on public.leads (brand)
  where brand is not null;

commit;

-- Then run add_lead_mortgage_columns.sql and create_unified_business_view.sql.
