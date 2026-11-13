-- access requests from the public landing page: an agent leaves their
-- details, an admin approves (which mints a row in `invites` and stores its
-- token here) or denies. every outcome is terminal, so these columns are the
-- request's complete history.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  npn text not null,
  states text[] not null default '{}',
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'denied')),
  -- the invites.token minted on approval; /signup?token=... reads the
  -- applicant's details back through it to pre-fill the form
  invite_token text,
  reviewed_by uuid references public.agents (id),
  reviewed_at timestamptz,
  denial_reason text,
  created_at timestamptz not null default now()
);

-- one open request per email: a second submit while the first is still
-- waiting is a no-op, not a second row in the queue
create unique index if not exists access_requests_open_email_idx
  on public.access_requests (lower(email))
  where status = 'requested';

create index if not exists access_requests_status_idx
  on public.access_requests (status, created_at);

create index if not exists access_requests_invite_token_idx
  on public.access_requests (invite_token)
  where invite_token is not null;

-- only the server (service role) reads or writes this table; with rls on and
-- no policies, the publishable key gets nothing
alter table public.access_requests enable row level security;
