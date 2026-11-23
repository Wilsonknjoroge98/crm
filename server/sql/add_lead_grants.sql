-- free leads an admin gives an agent from the refunds page ("give free
-- leads"). the server adds the leads to the agent's gsq balance, then writes
-- one row here, so every free lead has a record of who, what and why.
--
-- run once in the supabase sql editor, then run:
--   grant select on public.lead_grants to fex_sheet_reader;
-- so the fex business master sheet can read it.
-- if it stops with "relation lead_grants already exists", the first version's
-- table is there: check it is empty, drop it, and run this again.
create table public.lead_grants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_id uuid not null references public.agents (id),
  -- the gsq ledger doc that was credited (lowercased email)
  agent_email text not null,
  lead_type text not null
    check (lead_type in ('web_verified', 'web_unverified', 'instant_form', 'live_transfer')),
  quantity int not null check (quantity between 1 and 100),
  reason text not null check (length(trim(reason)) between 1 and 500),
  given_by uuid references public.agents (id)
);

create index if not exists lead_grants_created_at_idx
  on public.lead_grants (created_at);

-- only the server (service role) reads or writes this table; with rls on and
-- no policies, the publishable key gets nothing
alter table public.lead_grants enable row level security;
