-- instant form leads can arrive without an email, state or last name (meta
-- forms don't always ask, a one word full_name has no last name). gsq has
-- already issued the lead by then, so the row has to land anyway.
alter table public.leads
  alter column last_name drop not null,
  alter column email drop not null,
  alter column state drop not null;
