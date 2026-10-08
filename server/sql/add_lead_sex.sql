-- Typed column for the lead's sex. GSQ sends it for both products: the
-- funnel as "Male"/"Female", instant forms as the Meta answer ("male",
-- "female"). Nullable — funnel leads ingested before GSQ started sending it
-- simply stay null.
alter table public.leads
  add column if not exists sex text;

-- Instant form leads already had sex in raw_fields.sex; move it to the
-- column so the card only reads one place. Only touches rows that still
-- carry the key, so re-running is a no-op.
update public.leads
set
  sex = coalesce(sex, raw_fields ->> 'sex'),
  raw_fields = raw_fields - 'sex'
where raw_fields ? 'sex';

-- Re-run create_unified_business_view.sql after this so the business view
-- exposes the column.
