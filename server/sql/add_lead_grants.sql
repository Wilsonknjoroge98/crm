-- free leads given to an agent by an admin (google review bounties,
-- make-goods for bad leads, comps, the owner's own use). before this they
-- were given by hand-editing the agent's credit counters in gsq's firestore,
-- which left no record. the refunds page writes one row here per grant, then
-- credits the agent's gsq ledger, then marks the row credited.
--
-- run once in the supabase sql editor, then run:
--   grant select on public.lead_grants to fex_sheet_reader;
-- so the fex business master sheet job can read grants.
create table if not exists public.lead_grants (
  -- the server stores the client's request id here, so a retried grant is
  -- refused (unique violation) instead of crediting twice
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- no "on delete": like the refund and access request reviewer columns,
  -- a grant keeps the agent rows it names, so the audit trail stays whole
  agent_id uuid references public.agents (id),
  -- gsq keys its ledgers by lowercased email, so this is the ledger doc the
  -- grant credited even if the agent's crm email changes later
  agent_email text not null check (agent_email = lower(agent_email)),
  -- only gsq has a credit path today (keyley's pool has none, same as refunds)
  brand text not null default 'gsq' check (brand in ('gsq')),
  product text not null
    check (product in ('web', 'instant_form', 'live_transfer')),
  -- the web split; instant forms and live transfers have no split, so both
  -- stay 0 for them and quantity carries the count
  verified_count int not null default 0 check (verified_count >= 0),
  unverified_count int not null default 0 check (unverified_count >= 0),
  -- total leads given, for every product
  quantity int not null check (quantity between 1 and 100),
  reason text not null
    check (reason in ('review_bounty', 'bad_lead_make_good', 'comp', 'owner_use', 'other')),
  note text not null check (length(btrim(note)) between 1 and 500),
  granted_by uuid not null references public.agents (id),
  -- credited: the gsq ledger write landed.
  -- failed: gsq refused the write, nothing was credited (it is one atomic
  --   update), error says why.
  -- pending: not confirmed. either in progress, or the gsq write's outcome
  --   is unknown (error then starts "Outcome unknown"), or the ledger was
  --   credited but marking the row failed. check the agent's gsq balance
  --   before giving the leads again.
  status text not null default 'pending'
    check (status in ('pending', 'credited', 'failed')),
  credited_at timestamptz,
  error text,
  constraint lead_grants_quantity_matches check (
    (product = 'web' and quantity = verified_count + unverified_count)
    or (product <> 'web' and verified_count = 0 and unverified_count = 0)
  )
);

create index if not exists lead_grants_created_at_idx
  on public.lead_grants (created_at);

create index if not exists lead_grants_agent_id_idx
  on public.lead_grants (agent_id);

-- only the server (service role) reads or writes this table; with rls on and
-- no policies, the publishable key gets nothing
alter table public.lead_grants enable row level security;
