alter table public.leads enable row level security;
create policy "Agents can see their leads" ON public.leads
for ALL
TO Authenticated
USING (agent_id = auth.uid());


alter table policies enable row level security;

create policy "agents can see their downline policies"
on "public"."policies"
to authenticated, authenticator
for SELECT
using (
  (client_id IN ( SELECT ac.client_id
   FROM agent_clients ac
  WHERE (ac.agent_id IN ( SELECT get_agent_tree.id
           FROM get_agent_tree(auth.uid()) get_agent_tree(id)))))

);
