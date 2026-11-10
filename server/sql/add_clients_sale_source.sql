-- Which outside CRM reported a sale (e.g. 'shepherds'); null for sales an
-- agent marks in the crm. One client per lead per source: Shepherds resends
-- its webhook ~8s into a cold start, and both requests passed the
-- "already recorded" check before either inserted, booking the sale twice
-- (Joyce Mason and Michele Padilla 2026-11-04, Frank Cannariato 2026-11-09).
-- Partial on purpose: 600+ leads legitimately carry several crm-marked
-- clients (households, re-sales), so lead_id alone can't be unique.
alter table public.clients
  add column if not exists sale_source text null;

create unique index if not exists clients_lead_sale_source_key
  on public.clients (lead_id, sale_source)
  where sale_source is not null and lead_id is not null;
