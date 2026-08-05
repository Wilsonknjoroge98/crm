-- 1. Drop uniqueness on phone

alter table leads drop constraint if exists leads_phone_key;

-- 2. original_agent_id column, redistributed_agent_id column, redistributed_at column

alter table leads
  add column if not exists original_agent_id uuid references agents (id),
  add column if not exists redistributed_agent_id uuid references agents (id),
  add column if not exists redistributed_at timestamptz;

-- 3. Backfill original_agent_id with existing agent_id

update leads
set original_agent_id = agent_id
where original_agent_id is null
  and agent_id is not null;

-- 4. Add phone + vendor uniqueness

alter table leads
  add constraint leads_phone_lead_vendor_id_key unique (phone, lead_vendor_id);
