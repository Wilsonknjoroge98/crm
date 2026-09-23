-- instant form answers straight from meta, keyed by the form question
alter table public.leads
  add column if not exists raw_fields jsonb;

-- instant forms only ask for age, so dob can't be required anymore
alter table public.leads
  alter column date_of_birth drop not null;

