-- Run after create_messages.sql

-- sendblue status events can come without date_sent, received_at keeps every row orderable.
-- not in the webhook payload so upserts leave it at first insert
alter table public.messages
  add column if not exists received_at timestamptz not null default now();

create index if not exists messages_line_number_idx
  on public.messages (sendblue_number, number);

-- inbox filters these by agent on every load
create index if not exists leads_agent_id_idx on public.leads (agent_id);
create index if not exists agent_clients_agent_id_idx on public.agent_clients (agent_id);

-- keyed by agent not line, two agents can share a line and each has their own unread state
create table if not exists public.message_reads (
  agent_id uuid not null references public.agents (id) on delete cascade,
  number text not null,
  last_read_at timestamptz not null default now(),
  primary key (agent_id, number)
);

-- server only (service role), no policies
alter table public.message_reads enable row level security;

-- One row per thread on the line whose number is one of the agent's leads or
-- clients, newest first. unread_total covers every thread, not just this page.
-- Phones in leads/clients are mostly 10 digits but not always, so match on the last 10.
create or replace function public.message_inbox(
  p_agent_id uuid,
  p_line text,
  p_limit int default 50,
  p_before timestamptz default null
)
returns table (
  number text,
  last_content text,
  last_outbound boolean,
  last_status text,
  last_at timestamptz,
  unread_count int,
  lead_id uuid,
  client_id uuid,
  first_name text,
  last_name text,
  unread_total int
)
language sql
stable
set search_path = public
as $$
  with msgs as (
    select m.number, m.content, m.is_outbound, m.status,
      coalesce(m.sent_at, m.received_at) as at
    from messages m
    where m.sendblue_number = p_line
  ),
  owned_leads as (
    select distinct on (p.n)
      '+1' || p.n as number, l.id as lead_id, l.first_name, l.last_name
    from leads l
    cross join lateral (select right(regexp_replace(l.phone, '\D', '', 'g'), 10) as n) p
    where l.agent_id = p_agent_id and length(p.n) = 10
    order by p.n, l.created_at desc
  ),
  owned_clients as (
    select distinct on (p.n)
      '+1' || p.n as number, c.id as client_id, c.first_name, c.last_name
    from clients c
    join agent_clients ac on ac.client_id = c.id and ac.agent_id = p_agent_id
    cross join lateral (select right(regexp_replace(c.phone, '\D', '', 'g'), 10) as n) p
    where length(p.n) = 10
    order by p.n, c.created_at desc
  ),
  threads as (
    select distinct on (msgs.number) msgs.*
    from msgs
    order by msgs.number, msgs.at desc
  ),
  unread as (
    select msgs.number, count(*)::int as unread_count
    from msgs
    left join message_reads r
      on r.agent_id = p_agent_id and r.number = msgs.number
    where not msgs.is_outbound
      and msgs.at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    group by msgs.number
  ),
  inbox as (
    -- sold leads become clients, the client name is the current one
    select t.number, t.content, t.is_outbound, t.status, t.at,
      coalesce(u.unread_count, 0) as unread_count,
      ol.lead_id, oc.client_id,
      coalesce(oc.first_name, ol.first_name) as first_name,
      coalesce(oc.last_name, ol.last_name) as last_name
    from threads t
    left join owned_leads ol on ol.number = t.number
    left join owned_clients oc on oc.number = t.number
    left join unread u on u.number = t.number
    where ol.lead_id is not null or oc.client_id is not null
  ),
  totals as (
    select coalesce(sum(inbox.unread_count), 0)::int as unread_total from inbox
  )
  select i.number, i.content, i.is_outbound, i.status, i.at, i.unread_count,
    i.lead_id, i.client_id, i.first_name, i.last_name, totals.unread_total
  from inbox i
  cross join totals
  where p_before is null or i.at < p_before
  order by i.at desc
  limit p_limit;
$$;

-- takes the agent id as an argument, so it must not be callable through the public api
revoke execute on function public.message_inbox(uuid, text, int, timestamptz)
  from public, anon, authenticated;
