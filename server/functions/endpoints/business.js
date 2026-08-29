const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');
const {
  SUPERUSER_ID,
  applyOwnershipFilter,
  findOwnedPerson,
} = require('./business_access');
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_BULK_DELETE = 100;
const MAX_SEARCH_LENGTH = 200;
const MAX_INDEXED_SEARCH_IDS = 100;
const MAX_NOTES_LENGTH = 10000;
const METRICS_PAGE_SIZE = 1000;
const METRICS_ID_CHUNK_SIZE = 100;
const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';
// Payments per year by premium_frequency; unknown frequencies assume monthly.
const PREMIUM_ANNUAL_MULTIPLIERS = {
  'weekly': 52,
  'monthly': 12,
  'quarterly': 4,
  'semi-annually': 2,
  'semi-annual': 2,
  'annually': 1,
  'annual': 1,
};
// Card rows surface contact, notes, and the underwriting summary directly,
// so the list projection carries what the drawer alone used to need.
// `policies` is deliberately absent: the view builds it with a per-row lateral,
// so sorting on it makes PostgreSQL build the rollup for every row before
// paging discards it. attachPolicies fetches it one page at a time instead.
const BUSINESS_LIST_FIELDS = [
  'id',
  'lead_id',
  'client_id',
  'lifecycle_status',
  'first_name',
  'last_name',
  'email',
  'phone',
  'state',
  'date_of_birth',
  'verified',
  'smoker',
  'height_feet',
  'height_inches',
  'weight_lbs',
  'cholesterol_medication',
  'blood_pressure_medication',
  'face_amount',
  'beneficiary',
  'why',
  'notes',
  'lead_vendor_id',
  'lead_vendor_name',
  'lead_created_at',
  'created_at',
].join(',');
// Detail is a single row looked up by id with no ORDER BY, so the lateral runs
// once and the rollup can stay in the projection.
const BUSINESS_DETAIL_FIELDS = [
  'id',
  'lead_id',
  'client_id',
  'lifecycle_status',
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'state',
  'address',
  'city',
  'zip',
  'occupation',
  'marital_status',
  'annual_income',
  'agent_id',
  'sold',
  'verified',
  'smoker',
  'height_feet',
  'height_inches',
  'weight_lbs',
  'cholesterol_medication',
  'blood_pressure_medication',
  'face_amount',
  'premium',
  'premium_min',
  'premium_max',
  'availability',
  'selected_plan',
  'selected_carrier',
  'beneficiary',
  'priority',
  'why',
  'gsq_source',
  'gsq_id',
  'gsq_live_transfer',
  'lead_vendor_id',
  'lead_vendor_name',
  'notes',
  'lead_created_at',
  'client_created_at',
  'created_at',
  'updated_at',
  'policies',
].join(',');
// Whitelist keeps client-supplied sort fields from reaching PostgREST raw.
const SORT_FIELDS = new Set([
  'id',
  'created_at',
  'lead_created_at',
  'client_created_at',
  'first_name',
  'last_name',
  'email',
  'phone',
  'state',
  'lifecycle_status',
]);

class QueryValidationError extends Error {}

// Guards the delete endpoint: capped, deduplicated, UUID-only ids.
const parseBulkPersonIds = (body) => {
  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw new QueryValidationError('ids must be a non-empty array');
  }
  if (body.ids.length > MAX_BULK_DELETE) {
    throw new QueryValidationError(
      `ids must contain at most ${MAX_BULK_DELETE} items`,
    );
  }

  const ids = [...new Set(body.ids)];
  if (
    ids.some(
      (id) =>
        typeof id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  ) {
    throw new QueryValidationError('ids must contain valid UUIDs');
  }
  return ids;
};

const chunkValues = (values, size = METRICS_ID_CHUNK_SIZE) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

// PostgREST caps responses at 1000 rows, so full sets are drained page by page.
const fetchAllRows = async (buildQuery) => {
  const rows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await buildQuery().range(
      offset,
      offset + METRICS_PAGE_SIZE - 1,
    );
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    hasMore = page.length === METRICS_PAGE_SIZE;
    offset += page.length;
  }

  return rows;
};

// Distinct visible client ids, optionally narrowed to GSQ-sourced people.
const fetchVisibleClientIds = async ({
  supabase,
  agentId,
  isSuperuser,
  gsqOnly = false,
}) => {
  const buildQuery = (ownershipFilter) => {
    let query = supabase
      .from('business')
      .select('client_id')
      .not('client_id', 'is', null)
      .order('client_id', { ascending: true });
    if (gsqOnly) {
      query = query.eq('lead_vendor_id', GSQ_LEAD_VENDOR_ID);
    }
    return ownershipFilter(query);
  };

  const rows = await fetchAllRows(() =>
    buildQuery((query) =>
      isSuperuser ? query : applyOwnershipFilter(query, agentId),
    ),
  );

  return [
    ...new Set(rows.map(({ client_id: clientId }) => clientId).filter(Boolean)),
  ];
};

// Puts the `policies` rollup back on a page of list rows. Filtering by id runs
// the view's lateral only for those rows, so the cost stays flat as data grows.
const attachPolicies = async (supabase, rows) => {
  if (rows.length === 0) return rows;

  const { data, error } = await supabase
    .from('business')
    .select('id,policies')
    .in(
      'id',
      rows.map(({ id }) => id),
    );
  if (error) throw error;

  const policiesById = new Map(
    (data || []).map(({ id, policies }) => [id, policies]),
  );
  return rows.map((row) => ({
    ...row,
    policies: policiesById.get(row.id) ?? [],
  }));
};

// Chunked .in() lookups keep request URLs under PostgREST's length limits.
const fetchPoliciesForClientIds = async (supabase, clientIds) => {
  const policies = [];
  for (const clientIdChunk of chunkValues(clientIds)) {
    policies.push(
      ...(await fetchAllRows(() =>
        supabase
          .from('policies')
          .select('id,client_id,premium_amount,premium_frequency')
          .in('client_id', clientIdChunk)
          .order('id', { ascending: true }),
      )),
    );
  }
  return policies;
};

// Superusers see every policy, so the client-id intersection is skipped.
const fetchAllPolicies = async (supabase) =>
  fetchAllRows(() =>
    supabase
      .from('policies')
      .select('id,client_id,premium_amount,premium_frequency')
      .order('id', { ascending: true }),
  );

// Total Closed annualizes by payment frequency (weekly x52, quarterly x4, ...).
const annualizePremium = ({
  premium_amount: amount,
  premium_frequency: frequency,
}) => {
  const multiplier =
    PREMIUM_ANNUAL_MULTIPLIERS[String(frequency || '').toLowerCase()] ?? 12;
  return (Number(amount) || 0) * multiplier;
};

const parsePositiveInteger = (value, fallback, field, maximum) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new QueryValidationError(`${field} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new QueryValidationError(`${field} must be a positive integer`);
  }
  if (maximum && parsed > maximum) {
    throw new QueryValidationError(`${field} must be at most ${maximum}`);
  }

  return parsed;
};

// Validates every list-endpoint query param; bad input throws -> 400.
const parsePeopleQuery = (query) => {
  const page = parsePositiveInteger(
    query.page,
    DEFAULT_PAGE,
    'page',
  );
  const limit = parsePositiveInteger(
    query.limit,
    DEFAULT_LIMIT,
    'limit',
    MAX_LIMIT,
  );
  const sortBy = query.sortBy ?? query.sort ?? 'created_at';
  const rawSortOrder = query.sortOrder ?? query.direction ?? 'desc';

  if (typeof sortBy !== 'string' || !SORT_FIELDS.has(sortBy)) {
    throw new QueryValidationError('Unsupported sort field');
  }
  if (typeof rawSortOrder !== 'string') {
    throw new QueryValidationError('sortOrder must be asc or desc');
  }
  const sortOrder = rawSortOrder.toLowerCase();
  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new QueryValidationError('sortOrder must be asc or desc');
  }

  if (query.search !== undefined && typeof query.search !== 'string') {
    throw new QueryValidationError('search must be a string');
  }

  const rawSearch = query.search?.trim() || '';
  let search = rawSearch;
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new QueryValidationError(
      `search must be at most ${MAX_SEARCH_LENGTH} characters`,
    );
  }

  // The generated vectors store phone numbers as digits only.
  if (search && /^[\d\s()+.-]+$/.test(search)) {
    search = search.replace(/\D/g, '');
  }
  if (rawSearch && !/[\p{L}\p{N}]/u.test(search)) {
    throw new QueryValidationError('search must include letters or numbers');
  }

  if ((page - 1) * limit > Number.MAX_SAFE_INTEGER) {
    throw new QueryValidationError('page is too large');
  }

  if (query.status !== undefined && typeof query.status !== 'string') {
    throw new QueryValidationError('status must be lead or sale');
  }
  const normalizedStatus = query.status?.trim().toLowerCase() || '';
  if (normalizedStatus && !['lead', 'sale'].includes(normalizedStatus)) {
    throw new QueryValidationError('status must be lead or sale');
  }
  const status = normalizedStatus ? normalizedStatus.toUpperCase() : null;
  const gsqOnly = query.gsqOnly === 'true';

  return { page, limit, sortBy, sortOrder, search, status, gsqOnly };
};

// Contains-search: every whitespace-separated term becomes an escaped
// %term% pattern that must match the trigram-indexed people_search_text.
const buildSearchPatterns = (search) =>
  search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `%${term.replace(/[\\%_]/g, '\\$&')}%`);

const applyContainsFilters = (query, column, patterns) =>
  patterns.reduce(
    (filtered, pattern) => filtered.ilike(column, pattern),
    query,
  );

const searchSourceTable = async ({
  supabase,
  table,
  patterns,
  agentId,
  isSuperuser,
}) => {
  // Leads carry their owning agent, so they are narrowed here. Clients do not,
  // and listing every owned id overflowed the request URL. Their candidates go
  // unnarrowed: the view query applies ownership alongside them.
  const applyOwnership = (query) =>
    !isSuperuser && table === 'leads' ? query.eq('agent_id', agentId) : query;

  return applyOwnership(
    applyContainsFilters(
      supabase.from(table).select('id'),
      'people_search_text',
      patterns,
    ),
  ).limit(MAX_INDEXED_SEARCH_IDS + 1);
};

// Indexed search: collect candidate lead/client ids from the trigram-indexed
// source-table columns, then filter the view by id. Past
// MAX_INDEXED_SEARCH_IDS candidates, fall back to filtering the view directly.
const findSearchMatches = async ({
  supabase,
  search,
  agentId,
  isSuperuser,
}) => {
  const patterns = buildSearchPatterns(search);
  const [leadResult, clientResult] = await Promise.all([
    searchSourceTable({
      supabase,
      table: 'leads',
      patterns,
      agentId,
      isSuperuser,
    }),
    searchSourceTable({
      supabase,
      table: 'clients',
      patterns,
      agentId,
      isSuperuser,
    }),
  ]);

  if (leadResult.error) throw leadResult.error;
  if (clientResult.error) throw clientResult.error;

  const leadIds = [
    ...new Set((leadResult.data || []).map(({ id }) => id)),
  ];
  const clientIds = [
    ...new Set((clientResult.data || []).map(({ id }) => id)),
  ];

  return {
    leadIds,
    clientIds,
    directPatterns:
      leadIds.length + clientIds.length > MAX_INDEXED_SEARCH_IDS
        ? patterns
        : null,
  };
};

const applySearchFilter = (
  query,
  { leadIds, clientIds, directPatterns },
) => {
  if (directPatterns) {
    return applyContainsFilters(query, 'search_text', directPatterns);
  }

  const filters = [];
  if (leadIds.length > 0) {
    filters.push(`lead_id.in.(${leadIds.join(',')})`);
  }
  if (clientIds.length > 0) {
    filters.push(`client_id.in.(${clientIds.join(',')})`);
  }

  return filters.length > 0 ? query.or(filters.join(',')) : null;
};

// Single choke point for ownership, search, and lifecycle filters; both the
// list query and its count re-query go through here.
const applyPeopleFilters = ({
  query,
  agentId,
  isSuperuser,
  searchMatches,
  status,
  gsqOnly,
}) => {
  let filteredQuery = query;

  if (!isSuperuser) {
    filteredQuery = applyOwnershipFilter(filteredQuery, agentId);
  }

  if (searchMatches) {
    filteredQuery = applySearchFilter(filteredQuery, searchMatches);
  }

  if (status) {
    filteredQuery = filteredQuery.eq('lifecycle_status', status);
  }

  if (gsqOnly) {
    filteredQuery = filteredQuery.eq('lead_vendor_id', GSQ_LEAD_VENDOR_ID);
  }

  return filteredQuery;
};

// Lead spend comes from the GSQ project's stripe_orders mirror, matched on
// the purchasing account's email (see gsq.js /sales-analytics for the same
// source). Factory injectable so tests can stub Firestore.
const defaultCreateFirestore = () =>
  new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

const fetchStripeLeadSpend = async (createFirestore, email) => {
  const normalizedEmail = String(email || '').toLowerCase();
  if (!normalizedEmail) return 0;

  const db = createFirestore();
  const snapshot = await db
    .collection('stripe_orders')
    .where('email', '==', normalizedEmail)
    .get();

  return snapshot.docs.reduce(
    (total, doc) => total + (Number(doc.data().amountPaid) || 0),
    0,
  );
};

// Factory so tests can inject a fake Supabase client; production callers get
// the real service client by default.
const createBusinessRouter = ({
  supabase = supabaseService,
  createFirestore = defaultCreateFirestore,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  router.get('/', async (req, res) => {
    let parsedQuery;
    try {
      parsedQuery = parsePeopleQuery(req.query);
    } catch (error) {
      if (error instanceof QueryValidationError) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }

    const { page, limit, sortBy, sortOrder, search, status, gsqOnly } =
      parsedQuery;
    const agentId = req.agent?.id;
    const isSuperuser = agentId === SUPERUSER_ID;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    try {
      let searchMatches = null;
      if (search) {
        searchMatches = await findSearchMatches({
          supabase,
          search,
          agentId,
          isSuperuser,
        });

        if (
          searchMatches.leadIds.length === 0 &&
          searchMatches.clientIds.length === 0
        ) {
          return res.status(200).json({
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
      }

      let peopleQuery = applyPeopleFilters({
        query: supabase
          .from('business')
          .select(BUSINESS_LIST_FIELDS, { count: 'exact' }),
        agentId,
        isSuperuser,
        searchMatches,
        status,
        gsqOnly,
      });

      const offset = (page - 1) * limit;
      peopleQuery = peopleQuery
        .order(sortBy, {
          ascending: sortOrder === 'asc',
          nullsFirst: false,
        })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await peopleQuery;
      if (error?.code === 'PGRST103') {
        const countQuery = applyPeopleFilters({
          query: supabase
            .from('business')
            .select('id', { count: 'exact', head: true }),
          agentId,
          isSuperuser,
          searchMatches,
          status,
          gsqOnly,
        });
        const { error: countError, count: filteredCount } = await countQuery;
        if (countError) throw countError;

        const total = filteredCount ?? 0;
        return res.status(200).json({
          data: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          },
        });
      }
      if (error) throw error;

      const rows = await attachPolicies(supabase, data || []);

      const total = count ?? 0;
      logger.log('Fetched people successfully', {
        route: '/business',
        method: 'GET',
        requesterId: agentId,
        page,
        limit,
        total,
        hasSearch: !!search,
      });

      return res.status(200).json({
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Failed to fetch business records', {
        route: '/business',
        method: 'GET',
        requesterId: agentId,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch business records' });
    }
  });

  // Header strip: all-time financial figures. Lead spend is the account's
  // actual Stripe charge history rather than a per-lead price estimate.
  router.get('/metrics', async (req, res) => {
    const agentId = req.agent?.id;
    const isSuperuser = agentId === SUPERUSER_ID;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    try {
      let leadsQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });
      if (!isSuperuser) {
        leadsQuery = leadsQuery.eq('agent_id', agentId);
      }

      const fetchPolicies = async () => {
        if (isSuperuser) return fetchAllPolicies(supabase);
        const visibleClientIds = await fetchVisibleClientIds({
          supabase,
          agentId,
          isSuperuser,
        });
        return fetchPoliciesForClientIds(supabase, visibleClientIds);
      };

      const [leadsResult, policies, leadSpendRaw] = await Promise.all([
        leadsQuery,
        fetchPolicies(),
        fetchStripeLeadSpend(createFirestore, req.agent?.email),
      ]);
      if (leadsResult.error) throw leadsResult.error;

      const leadsDelivered = leadsResult.count ?? 0;
      const totalClosed = Number(
        policies
          .reduce((total, policy) => total + annualizePremium(policy), 0)
          .toFixed(2),
      );
      const leadSpend = Number(leadSpendRaw.toFixed(2));

      return res.status(200).json({
        data: {
          leadsDelivered,
          closedSales: policies.length,
          totalClosed,
          leadSpend,
          roiNet: Number((totalClosed - leadSpend).toFixed(2)),
          roiMultiplier:
            leadSpend > 0 ? Number((totalClosed / leadSpend).toFixed(2)) : null,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch business metrics', {
        route: '/business/metrics',
        method: 'GET',
        requesterId: agentId,
        error,
      });
      return res
        .status(500)
        .json({ error: 'Failed to fetch business metrics' });
    }
  });

  // Inline card notes; writes land on the client row after conversion, else
  // the lead row, matching the view's coalesce(c.notes, l.notes).
  router.patch('/:id/notes', async (req, res) => {
    const agentId = req.agent?.id;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    const { notes } = req.body || {};
    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'notes must be a string' });
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      return res.status(400).json({
        error: `notes must be at most ${MAX_NOTES_LENGTH} characters`,
      });
    }

    try {
      const person = await findOwnedPerson(
        supabase,
        agentId,
        req.params.id,
        'id,lead_id,client_id',
      );
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }

      const target = person.client_id
        ? { table: 'clients', id: person.client_id }
        : { table: 'leads', id: person.lead_id };
      const { error } = await supabase
        .from(target.table)
        .update({ notes })
        .eq('id', target.id);
      if (error) throw error;

      return res.status(200).json({ data: { id: person.id, notes } });
    } catch (error) {
      logger.error('Failed to save notes', {
        route: '/business/:id/notes',
        method: 'PATCH',
        requesterId: agentId,
        personId: req.params.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to save notes' });
    }
  });

  // "Notify me" signups from the disabled quick-action buttons. Duplicate
  // signups are idempotent successes, not errors.
  router.post('/release-notifications', async (req, res) => {
    const agentId = req.agent?.id;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    const email = String(req.body?.email || req.agent?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    try {
      const { error } = await supabase
        .from('release_notifications_subscribers')
        .upsert(
          { email, feature: 'business_quick_actions', agent_id: agentId },
          { onConflict: 'email,feature', ignoreDuplicates: true },
        );
      if (error) throw error;

      return res.status(200).json({ data: { email } });
    } catch (error) {
      logger.error('Failed to save release notification signup', {
        route: '/business/release-notifications',
        method: 'POST',
        requesterId: agentId,
        error,
      });
      return res.status(500).json({ error: 'Failed to save signup' });
    }
  });

  // Bulk delete, all-or-nothing: cascades beneficiaries -> policies ->
  // agent links -> clients, then leads no other client still references.
  router.delete('/', async (req, res) => {
    const agentId = req.agent?.id;
    const isSuperuser = agentId === SUPERUSER_ID;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    let ids;
    try {
      ids = parseBulkPersonIds(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      let peopleQuery = supabase
        .from('business')
        .select('id,lead_id,client_id,lifecycle_status')
        .in('id', ids);

      if (!isSuperuser) {
        peopleQuery = applyOwnershipFilter(peopleQuery, agentId);
      }

      const { data: people, error: peopleError } = await peopleQuery;
      if (peopleError) throw peopleError;
      if ((people || []).length !== ids.length) {
        return res
          .status(404)
          .json({ error: 'One or more people were not found' });
      }

      const clientIds = people
        .map(({ client_id: clientId }) => clientId)
        .filter(Boolean);
      const saleLeadIds = people
        .filter(({ client_id: clientId }) => Boolean(clientId))
        .map(({ lead_id: leadId }) => leadId)
        .filter(Boolean);
      const leadIdsToDelete = people
        .filter(({ client_id: clientId }) => !clientId)
        .map(({ lead_id: leadId }) => leadId)
        .filter(Boolean);

      if (clientIds.length > 0) {
        const { data: policies, error: policiesLookupError } = await supabase
          .from('policies')
          .select('id')
          .in('client_id', clientIds);
        if (policiesLookupError) throw policiesLookupError;

        const policyIds = (policies || []).map(({ id }) => id);
        if (policyIds.length > 0) {
          const { error: beneficiariesError } = await supabase
            .from('beneficiaries')
            .delete()
            .in('policy_id', policyIds);
          if (beneficiariesError) throw beneficiariesError;
        }

        const { error: policiesError } = await supabase
          .from('policies')
          .delete()
          .in('client_id', clientIds);
        if (policiesError) throw policiesError;

        const { error: agentClientsError } = await supabase
          .from('agent_clients')
          .delete()
          .in('client_id', clientIds);
        if (agentClientsError) throw agentClientsError;

        const { error: clientsError } = await supabase
          .from('clients')
          .delete()
          .in('id', clientIds);
        if (clientsError) throw clientsError;
      }

      if (saleLeadIds.length > 0) {
        const uniqueSaleLeadIds = [...new Set(saleLeadIds)];
        const { data: remainingClients, error: remainingClientsError } =
          await supabase
            .from('clients')
            .select('lead_id')
            .in('lead_id', uniqueSaleLeadIds);
        if (remainingClientsError) throw remainingClientsError;

        const retainedLeadIds = new Set(
          (remainingClients || []).map(({ lead_id: leadId }) => leadId),
        );
        uniqueSaleLeadIds.forEach((leadId) => {
          if (!retainedLeadIds.has(leadId)) leadIdsToDelete.push(leadId);
        });
      }

      const uniqueLeadIdsToDelete = [...new Set(leadIdsToDelete)];
      if (uniqueLeadIdsToDelete.length > 0) {
        const { error: leadsError } = await supabase
          .from('leads')
          .delete()
          .in('id', uniqueLeadIdsToDelete);
        if (leadsError) throw leadsError;
      }

      logger.log('Deleted people successfully', {
        route: '/business',
        method: 'DELETE',
        requesterId: agentId,
        count: ids.length,
      });
      return res.status(200).json({ deletedIds: ids });
    } catch (error) {
      logger.error('Failed to delete business records', {
        route: '/business',
        method: 'DELETE',
        requesterId: agentId,
        count: ids.length,
        error,
      });
      return res.status(500).json({ error: 'Failed to delete business records' });
    }
  });

  // Drawer profile: full lead/client fields plus policies and beneficiaries.
  router.get('/:id', async (req, res) => {
    const agentId = req.agent?.id;

    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }

    try {
      const data = await findOwnedPerson(
        supabase,
        agentId,
        req.params.id,
        BUSINESS_DETAIL_FIELDS,
      );
      if (!data) {
        return res.status(404).json({ error: 'Person not found' });
      }

      logger.log('Fetched person details successfully', {
        route: '/business/:id',
        method: 'GET',
        requesterId: agentId,
        personId: req.params.id,
      });

      return res.status(200).json({ data });
    } catch (error) {
      logger.error('Failed to fetch person details', {
        route: '/business/:id',
        method: 'GET',
        requesterId: agentId,
        personId: req.params.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch person' });
    }
  });

  return router;
};

const businessRouter = createBusinessRouter();

module.exports = businessRouter;
module.exports.createBusinessRouter = createBusinessRouter;
module.exports.parsePeopleQuery = parsePeopleQuery;
module.exports.buildSearchPatterns = buildSearchPatterns;
module.exports.parseBulkPersonIds = parseBulkPersonIds;
module.exports.annualizePremium = annualizePremium;
