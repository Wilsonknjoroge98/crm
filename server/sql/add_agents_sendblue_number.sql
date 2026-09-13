-- Add sendblue number column
alter table public.agents
  add column if not exists sendblue_number text null;

-- Add e164 constraint. Drop so rerunning won't cause issues.
alter table public.agents
  drop constraint if exists agents_sendblue_number_e164;
alter table public.agents
  add constraint agents_sendblue_number_e164
  check (sendblue_number is null or sendblue_number ~ '^\+[1-9][0-9]{7,14}$');
