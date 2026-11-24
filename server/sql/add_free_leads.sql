-- free leads an admin gives an agent from the lead credits page ("give free
-- leads"). one transaction in gsq's firestore adds the leads to the agent's
-- balance and writes a free_leads/{id} marker with all of it; then the
-- server upserts the row here under the same id (the browser picks it, so a
-- retry fills in a missing row and never adds the leads twice).
--
-- run once in the supabase sql editor, then run:
--   grant select on public.free_leads to fex_sheet_reader;
-- so the fex business master sheet can read it.
-- earlier versions of this file made the table as public.lead_grants. if that
-- table is there, check it is empty and drop it (drop table public.lead_grants;)
-- before running this; if it has rows, rename it and its constraints instead.
create table public.free_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_id uuid not null references public.agents (id),
  -- the gsq ledger doc that was credited (lowercased email)
  agent_email text not null,
  -- keep in step with LEAD_TYPES in server/functions/endpoints/free_leads.js
  -- and client/src/components/FreeLeads.jsx
  lead_type text not null
    check (lead_type in (
      'gsq_verified', 'gsq_unverified', 'keyley_verified', 'gsq_instant_form', 'gsq_live_transfer'
    )),
  quantity int not null check (quantity between 1 and 100),
  reason text not null check (length(trim(reason)) between 1 and 500),
  given_by uuid references public.agents (id)
);

create index if not exists free_leads_created_at_idx
  on public.free_leads (created_at);

-- only the server (service role) reads or writes this table; with rls on and
-- no policies, the publishable key gets nothing
alter table public.free_leads enable row level security;
