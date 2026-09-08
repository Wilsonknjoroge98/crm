const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

// Lead-only rows belong to the lead's agent; sale rows belong solely to
// agents linked through agent_clients. Lead reassignment (duplicate phones,
// bulk import) must not grant access to another agent's client.
// The sale half reads the view's owner_agent_ids array; listing the ids put one
// UUID per owned client in the URL, which overflowed the HTTP header limit.
const applyOwnershipFilter = (query, agentId) =>
  query.or(
    `and(client_id.is.null,agent_id.eq.${agentId}),` +
      `owner_agent_ids.cs.{${agentId}}`,
  );

const findOwnedPerson = async (supabase, agentId, personId, fields) => {
  const isSuperuser = agentId === SUPERUSER_ID;

  let query = supabase
    .from('business')
    .select(fields)
    .eq('id', personId);

  if (!isSuperuser) {
    query = applyOwnershipFilter(query, agentId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};

module.exports = {
  SUPERUSER_ID,
  applyOwnershipFilter,
  findOwnedPerson,
};
