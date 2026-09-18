-- refund requests live on the lead row, trestle columns keep the api's names
alter table public.leads
  add column if not exists contact_grade text,
  add column if not exists activity_score smallint,
  add column if not exists name_match boolean,
  add column if not exists refund_status text
    check (refund_status in ('requested', 'approved', 'denied')),
  add column if not exists refund_requested_by uuid references public.agents (id),
  -- every outcome is terminal (a denied refund can't be re-requested), so a
  -- lead has at most one review cycle and these columns are its complete
  -- history: requested_at drives the admin queue order, reviewed_by/at and
  -- denial_reason record who decided it and why.
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refund_reviewed_by uuid references public.agents (id),
  add column if not exists refund_reviewed_at timestamptz,
  add column if not exists refund_denial_reason text;

create index if not exists leads_refund_status_idx
  on public.leads (refund_status)
  where refund_status is not null;
