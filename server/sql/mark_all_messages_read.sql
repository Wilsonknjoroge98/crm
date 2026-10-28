-- One-off, run after create_message_inbox.sql and before the inbox ships.
-- Texts that landed while the webhook was live but the inbox wasn't would
-- all show as unread on day one. This marks every thread read for every
-- agent on the line, as of now. Anything arriving after it runs is unread
-- as normal. Safe to rerun, it only ever moves last_read_at forward.

begin;

insert into public.message_reads (agent_id, number, last_read_at)
select a.id, t.number, now()
from public.agents a
join (
  select distinct m.sendblue_number, m.number
  from public.messages m
) t on t.sendblue_number = a.sendblue_number
on conflict (agent_id, number) do update
  set last_read_at = greatest(public.message_reads.last_read_at, excluded.last_read_at);

-- agents with unread texts left, should come back empty
select a.id as agent_id, count(*) as unread_messages
from public.agents a
join public.messages m
  on m.sendblue_number = a.sendblue_number and not m.is_outbound
left join public.message_reads r
  on r.agent_id = a.id and r.number = m.number
where coalesce(m.sent_at, m.received_at) > coalesce(r.last_read_at, '-infinity'::timestamptz)
group by a.id;

commit;
