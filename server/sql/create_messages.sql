-- tagged by line not agent, prod has lines shared by two agents and both should see the thread
create table if not exists public.messages (
  message_handle text primary key,
  sendblue_number text not null,
  number text not null,
  content text,
  is_outbound boolean not null,
  status text,
  error_message text,
  sent_at timestamptz
);

-- security definer since agents has rls on with no policies, a plain subquery in the policy would see nothing
create or replace function public.agent_sendblue_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sendblue_number from public.agents where id = auth.uid();
$$;

alter table public.messages enable row level security;

drop policy if exists "agents can see their messages" on public.messages;
create policy "agents can see their messages"
  on public.messages
  for select
  to authenticated
  using (sendblue_number = public.agent_sendblue_number());

alter publication supabase_realtime add table public.messages;
