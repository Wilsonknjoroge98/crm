alter table public.clients
  add column if not exists monthly_premium numeric null;

-- Only the client's first (earliest) policy reliably represents a single
-- sale value — a later policy's premium isn't part of the same sale, so it
-- isn't summed in here (see CreatePolicyDialog's isFirstPolicy gate, which
-- only pre-fills premium_amount from monthly_premium for a client's first
-- policy for the same reason). Frequency ignored on purpose, the app
-- already treats premium_amount as monthly (ap = premium * 12).
update public.clients c
set monthly_premium = p.first_premium
from (
  select distinct on (client_id)
    client_id,
    premium_amount as first_premium
  from public.policies
  where premium_amount is not null
  order by client_id, created_at asc
) p
where p.client_id = c.id
  and c.monthly_premium is null;
