alter table public.clients
  add column if not exists monthly_premium numeric null;

-- frequency ignored on purpose, the app already treats premium_amount as monthly (ap = premium * 12)
update public.clients c
set monthly_premium = p.total
from (
  select client_id, sum(premium_amount) as total
  from public.policies
  where premium_amount is not null
  group by client_id
) p
where p.client_id = c.id
  and c.monthly_premium is null;
