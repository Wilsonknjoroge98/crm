-- One-time sweep for clients created by bulk upload, which never set
-- clients.monthly_premium, so they contribute $0 to Total Closed. Same rule as
-- add_clients_monthly_premium.sql: the client's earliest policy is the sale
-- value. Unlike that migration, uploaded policies carry a real
-- premium_frequency, so the premium is normalized to monthly here. Only
-- clients still null are touched, so it's safe to re-run.

-- 1. Preview what will change.
select
  c.id as client_id,
  c.first_name,
  c.last_name,
  p.premium_amount,
  p.premium_frequency,
  p.monthly_premium
from public.clients c
join (
  select distinct on (client_id)
    client_id,
    premium_amount,
    premium_frequency,
    round(
      premium_amount * case lower(premium_frequency)
        when 'weekly' then 52.0 / 12
        when 'quarterly' then 1.0 / 3
        when 'semi-annually' then 1.0 / 6
        when 'annually' then 1.0 / 12
        else 1
      end,
      2
    ) as monthly_premium
  from public.policies
  where premium_amount is not null
    and premium_amount > 0
  order by client_id, created_at asc
) p on p.client_id = c.id
where c.monthly_premium is null
order by c.last_name, c.first_name;

-- 2. Apply.
begin;

update public.clients c
set monthly_premium = p.monthly_premium
from (
  select distinct on (client_id)
    client_id,
    round(
      premium_amount * case lower(premium_frequency)
        when 'weekly' then 52.0 / 12
        when 'quarterly' then 1.0 / 3
        when 'semi-annually' then 1.0 / 6
        when 'annually' then 1.0 / 12
        else 1
      end,
      2
    ) as monthly_premium
  from public.policies
  where premium_amount is not null
    and premium_amount > 0
  order by client_id, created_at asc
) p
where p.client_id = c.id
  and c.monthly_premium is null;

-- Row count should match the preview; commit if it does, else rollback.
commit;
