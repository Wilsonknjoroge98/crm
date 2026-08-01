const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';
const OWNERSHIP_PAGE_SIZE = 1000;

const getOwnedClientIds = async (supabase, agentId) => {
  const clientIds = new Set();
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('agent_clients')
      .select('client_id')
      .eq('agent_id', agentId)
      .order('client_id', { ascending: true })
      .range(offset, offset + OWNERSHIP_PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data || [];
    rows.forEach(({ client_id: clientId }) => clientIds.add(clientId));
    hasMore = rows.length === OWNERSHIP_PAGE_SIZE;
    offset += rows.length;
  }

  return [...clientIds];
};

// Lead-only rows belong to the lead's agent; sale rows belong solely to
// agents linked through agent_clients. Lead reassignment (duplicate phones,
// bulk import) must not grant access to another agent's client.
const applyOwnershipFilter = (query, agentId, ownedClientIds) => {
  if (ownedClientIds.length === 0) {
    return query.is('client_id', null).eq('agent_id', agentId);
  }

  return query.or(
    `and(client_id.is.null,agent_id.eq.${agentId}),` +
      `client_id.in.(${ownedClientIds.join(',')})`,
  );
};

const findOwnedPerson = async (supabase, agentId, personId, fields) => {
  const isSuperuser = agentId === SUPERUSER_ID;
  const ownedClientIds = isSuperuser
    ? []
    : await getOwnedClientIds(supabase, agentId);

  let query = supabase
    .from('people')
    .select(fields)
    .eq('id', personId);

  if (!isSuperuser) {
    query = applyOwnershipFilter(query, agentId, ownedClientIds);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};

module.exports = {
  SUPERUSER_ID,
  getOwnedClientIds,
  applyOwnershipFilter,
  findOwnedPerson,
};
