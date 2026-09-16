-- refund requests live on the lead row, trestle columns keep the api's names
alter table public.leads
  add column if not exists contact_grade text,
  add column if not exists activity_score smallint,
  add column if not exists name_match boolean,
  add column if not exists refund_status text
    check (refund_status in ('requested', 'approved', 'denied')),
  add column if not exists refund_requested_by uuid references public.agents (id);

create index if not exists leads_refund_status_idx
  on public.leads (refund_status)
  where refund_status is not null;
