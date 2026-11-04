-- Mortgage-first lead columns, filled by Keyley (leads.brand = 'keyley')
-- through inboundGSQ. Typed columns rather than raw_fields, which stays for
-- Meta instant forms' free-form questions. Named without a brand prefix so any
-- mortgage protection product can use them. All nullable: every existing lead
-- and every other source leaves them empty.
--
-- address / city / zip use the same names as the clients columns, so the
-- business view coalesces them and Make Client copies them over unchanged.
-- Run after add_lead_brand.sql. Safe to re-run.

begin;

alter table public.leads
  add column if not exists mortgage_balance numeric,              -- estimated balance (records or the lead's own number)
  add column if not exists mortgage_balance_adjusted boolean,     -- true = the lead corrected the records estimate
  add column if not exists mortgage_years_left smallint,
  add column if not exists term_years smallint,                   -- term quoted (10/15/20/25/30)
  add column if not exists homeowner boolean,
  add column if not exists address text,                          -- street line, like clients.address
  add column if not exists city text,
  add column if not exists zip text,
  add column if not exists home_value numeric,                    -- ATTOM AVM estimate
  add column if not exists home_equity numeric,
  add column if not exists home_value_confidence smallint,        -- ATTOM AVM confidence, 0-100
  add column if not exists record_owners text[],                  -- owner names on the county record
  add column if not exists owner_name_match boolean;              -- lead's name matches a record owner (not Trestle's name_match)

alter table public.leads
  drop constraint if exists leads_home_value_confidence_check,
  add constraint leads_home_value_confidence_check
    check (home_value_confidence is null or home_value_confidence between 0 and 100);

commit;

-- Then re-run create_unified_business_view.sql so the business view exposes them.
