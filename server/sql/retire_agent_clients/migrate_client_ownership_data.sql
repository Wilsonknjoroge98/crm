begin;

-- Add clients.agent_id column and an index for it
alter table public.clients
  add column if not exists agent_id uuid references public.agents(id);

create index if not exists clients_agent_id_idx
  on public.clients (agent_id);

-- Fill in clients.agent_id from agent_clients, if a client has multiple linked agents, choose the one who wrote its policies, else the one linked first
with ranked as (
  select
    ac.client_id,
    ac.agent_id,
    row_number() over (
      partition by ac.client_id
      order by
        exists (
          select 1 from public.policies p
          where p.client_id = ac.client_id
            and p.writing_agent_id = ac.agent_id
        ) desc,
        ac.created_at asc,
        ac.id asc
    ) as rn
  from public.agent_clients ac
)
update public.clients c
set agent_id = r.agent_id
from ranked r
where r.client_id = c.id
  and r.rn = 1
  and c.agent_id is null;

-- Backfill agent_clients.agent_notes into clients.notes since bulk upload never stopped writing to agent_clients.agent_notes. If both exist, preserve clients.notes
with imported as (
  select distinct on (client_id)
    client_id, agent_notes
  from public.agent_clients
  where nullif(btrim(agent_notes), '') is not null
  order by client_id, created_at asc, id asc
)
update public.clients c
set notes = i.agent_notes
from imported i
where i.client_id = c.id
  and nullif(btrim(c.notes), '') is null;

commit;

-- Output total number of clients and clients missing an agent_id (should be 0)
select
  (select count(*) from public.clients) as clients,
  (select count(*) from public.clients where agent_id is null) as clients_missing_owner;
