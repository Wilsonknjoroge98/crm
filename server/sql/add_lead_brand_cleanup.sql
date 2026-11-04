-- Phase 2 of 2. Run AFTER the crm functions that write leads.brand are deployed
-- (add_lead_brand.sql was phase 1).
--
-- Leaves exactly one source per lead: a brand (house leads) or a lead vendor
-- (leads an agent brought in), and removes the GetSeniorQuotes.com vendor row,
-- which nothing reads any more. Safe to re-run.

begin;

-- GSQ leads that the old functions wrote between phase 1 and the deploy.
update public.leads
set brand = 'gsq'
where brand is null
  and lead_vendor_id = (
    select id from public.lead_vendors where name = 'GetSeniorQuotes.com'
  );

update public.leads
set lead_vendor_id = null
where brand is not null
  and lead_vendor_id is not null;

alter table public.leads
  drop constraint if exists leads_source_check,
  add constraint leads_source_check
    check (num_nonnulls(brand, lead_vendor_id) = 1);

-- Nothing references it after the update above (leads_vendor_fk is the only
-- foreign key to lead_vendors).
delete from public.lead_vendors
where name = 'GetSeniorQuotes.com';

commit;
