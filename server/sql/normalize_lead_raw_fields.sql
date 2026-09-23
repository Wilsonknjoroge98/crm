-- One-time sweep for instant form leads ingested before inboundGSQ started
-- canonicalising Meta question keys (age / sex / coverage / urgency) and
-- folding both forms' "why" questions into leads.why. Rows already in the
-- canonical shape are untouched, so it's safe to re-run.

-- 1. Preview.
select id, first_name, why, raw_fields
from public.leads
where gsq_instant_form
  and (
    raw_fields ? 'what_is_your_age?'
    or raw_fields ? 'select_your_sex_at_birth?'
    or raw_fields ? 'how_much_coverage_do_you_want?'
    or raw_fields ? 'how_much_coverage_do_you_need?'
    or raw_fields ? 'how_soon_do_you_need_to_buy_coverage?'
    or raw_fields ? 'why_do_you_need_life_insurance?'
  );

-- 2. Apply.
begin;

update public.leads
set
  why = coalesce(why, raw_fields ->> 'why_do_you_need_life_insurance?'),
  raw_fields = jsonb_strip_nulls(
    -- keep any question we don't recognise, minus the consent paragraph
    (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      from jsonb_each(raw_fields)
      where key not in (
        'what_is_your_age?',
        'select_your_sex_at_birth?',
        'how_much_coverage_do_you_want?',
        'how_much_coverage_do_you_need?',
        'how_soon_do_you_need_to_buy_coverage?',
        'why_do_you_need_life_insurance?'
      )
      and key not like 'you\_will\_be\_contacted\_by%'
    )
    || jsonb_build_object(
      'age',      substring(raw_fields ->> 'what_is_your_age?' from '\d+'),
      'sex',      raw_fields ->> 'select_your_sex_at_birth?',
      'coverage', coalesce(
                    raw_fields ->> 'how_much_coverage_do_you_want?',
                    raw_fields ->> 'how_much_coverage_do_you_need?'
                  ),
      'urgency',  raw_fields ->> 'how_soon_do_you_need_to_buy_coverage?'
    )
  )
where gsq_instant_form
  and (
    raw_fields ? 'what_is_your_age?'
    or raw_fields ? 'select_your_sex_at_birth?'
    or raw_fields ? 'how_much_coverage_do_you_want?'
    or raw_fields ? 'how_much_coverage_do_you_need?'
    or raw_fields ? 'how_soon_do_you_need_to_buy_coverage?'
    or raw_fields ? 'why_do_you_need_life_insurance?'
  );

-- Row count should match the preview; commit if it does, else rollback.
commit;
