-- Authoritative marker for leads that came in through gsq's Meta instant
-- form webhook (inboundGSQ receives leadType: 'instant_form'). Mirrors
-- gsq_live_transfer: one boolean per gsq product, default false for the
-- funnel and every other vendor.
alter table public.leads
  add column if not exists gsq_instant_form boolean not null default false;

-- Backfill rows that landed before the column existed. raw_fields is only
-- ever written by the instant form path, so it's a safe proxy here.
update public.leads
set gsq_instant_form = true
where raw_fields is not null
  and gsq_instant_form = false;

-- Re-run create_unified_business_view.sql after this so the business view
-- exposes the column.
