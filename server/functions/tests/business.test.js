/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const {
  createBusinessRouter,
  parsePeopleQuery,
  parseBulkPersonIds,
  buildSearchPatterns,
  annualizePremium,
} = require('../endpoints/business');

// Independent copies of the API's projections. If a route starts selecting a
// column these don't list (or drops one they do), the tests fail on purpose.
const EXPECTED_LIST_FIELDS = [
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
const EXPECTED_DETAIL_FIELDS = [
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
const {
  getOwnedClientIds,
  applyOwnershipFilter,
} = require('../endpoints/business_access');

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

class FakeQuery {
  constructor(table, result) {
    this.table = table;
    this.result = result;
    this.calls = [];
  }

  record(method, args) {
    this.calls.push({ method, args });
    return this;
  }

  select(...args) {
    return this.record('select', args);
  }

  eq(...args) {
    return this.record('eq', args);
  }

  gte(...args) {
    return this.record('gte', args);
  }

  in(...args) {
    return this.record('in', args);
  }

  is(...args) {
    return this.record('is', args);
  }

  lte(...args) {
    return this.record('lte', args);
  }

  not(...args) {
    return this.record('not', args);
  }

  or(...args) {
    return this.record('or', args);
  }

  textSearch(...args) {
    return this.record('textSearch', args);
  }

  ilike(...args) {
    return this.record('ilike', args);
  }

  limit(...args) {
    return this.record('limit', args);
  }

  order(...args) {
    return this.record('order', args);
  }

  range(...args) {
    return this.record('range', args);
  }

  maybeSingle(...args) {
    return this.record('maybeSingle', args);
  }

  delete(...args) {
    return this.record('delete', args);
  }

  update(...args) {
    return this.record('update', args);
  }

  upsert(...args) {
    return this.record('upsert', args);
  }

  then(resolve, reject) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const makeSupabase = (results) => {
  const queues = Object.fromEntries(
    Object.entries(results).map(([table, values]) => [table, [...values]]),
  );
  const queries = [];

  return {
    queries,
    from: jest.fn((table) => {
      const result = queues[table]?.shift();
      if (!result) throw new Error(`Missing fake result for ${table}`);
      const query = new FakeQuery(table, result);
      queries.push(query);
      return query;
    }),
  };
};

// Fake Firestore for the Stripe order lookup: docsByEmail maps a queried
// email to the stripe_orders docs it should return.
const makeFirestore = (docsByEmail = {}, options = {}) => {
  const calls = [];
  const db = {
    collection: (name) => ({
      where: (field, op, value) => ({
        get: async () => {
          calls.push({ name, field, op, value });
          if (options.error) throw options.error;
          return {
            docs: (docsByEmail[value] || []).map((data) => ({
              data: () => data,
            })),
          };
        },
      }),
    }),
  };
  return { calls, createFirestore: () => db };
};

const makeApp = (supabase, agent, firestore = makeFirestore()) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    next();
  });
  app.use(
    '/business',
    createBusinessRouter({
      supabase,
      createFirestore: firestore.createFirestore,
    }),
  );
  return app;
};

const findQuery = (supabase, table, index = 0) =>
  supabase.queries.filter((query) => query.table === table)[index];

describe('people ownership helpers', () => {
  test('drains every ownership page and dedupes across pages', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      client_id: `client-${index}`,
    }));
    const supabase = makeSupabase({
      agent_clients: [
        { data: firstPage, error: null },
        {
          data: [firstPage[0], { client_id: 'client-1000' }],
          error: null,
        },
      ],
    });

    const ids = await getOwnedClientIds(supabase, 'agent-1');

    expect(ids).toHaveLength(1001);
    expect(findQuery(supabase, 'agent_clients').calls).toContainEqual({
      method: 'range',
      args: [0, 999],
    });
    expect(findQuery(supabase, 'agent_clients', 1).calls).toContainEqual({
      method: 'range',
      args: [1000, 1999],
    });
  });

  test('restricts an agent with no client links to lead-only rows', () => {
    const query = new FakeQuery('people', {});

    applyOwnershipFilter(query, 'agent-1', []);

    expect(query.calls).toEqual([
      { method: 'is', args: ['client_id', null] },
      { method: 'eq', args: ['agent_id', 'agent-1'] },
    ]);
  });

  test('grants sale rows only through client links', () => {
    const query = new FakeQuery('people', {});

    applyOwnershipFilter(query, 'agent-1', ['client-1', 'client-2']);

    expect(query.calls).toEqual([
      {
        method: 'or',
        args: [
          'and(client_id.is.null,agent_id.eq.agent-1),client_id.in.(client-1,client-2)',
        ],
      },
    ]);
  });
});

describe('parsePeopleQuery', () => {
  test('applies defaults', () => {
    expect(parsePeopleQuery({})).toEqual({
      page: 1,
      limit: 25,
      sortBy: 'created_at',
      sortOrder: 'desc',
      search: '',
      status: null,
      gsqOnly: false,
    });
  });

  test('accepts aliases and normalizes phone searches', () => {
    expect(
      parsePeopleQuery({
        page: '2',
        limit: '50',
        sort: 'last_name',
        direction: 'ASC',
        search: ' (555) 123-4567 ',
        status: ' Sale ',
        gsqOnly: 'true',
      }),
    ).toEqual({
      page: 2,
      limit: 50,
      sortBy: 'last_name',
      sortOrder: 'asc',
      search: '5551234567',
      status: 'SALE',
      gsqOnly: true,
    });
  });

  test.each([
    [{ page: '0' }, 'page must be a positive integer'],
    [{ limit: '101' }, 'limit must be at most 100'],
    [{ sortBy: 'premium' }, 'Unsupported sort field'],
    [{ sortOrder: 'sideways' }, 'sortOrder must be asc or desc'],
    [{ sortOrder: ['asc'] }, 'sortOrder must be asc or desc'],
    [{ search: 'x'.repeat(201) }, 'search must be at most 200 characters'],
    [{ search: '---' }, 'search must include letters or numbers'],
    [{ status: 'converted' }, 'status must be lead or sale'],
    [{ status: ['lead'] }, 'status must be lead or sale'],
  ])('rejects invalid query input', (query, message) => {
    expect(() => parsePeopleQuery(query)).toThrow(message);
  });

  test('lowercases, tokenizes, and escapes search terms', () => {
    expect(buildSearchPatterns('  Nadia   CVerify ')).toEqual([
      '%nadia%',
      '%cverify%',
    ]);
    expect(buildSearchPatterns('FAKE.crm@Example.com')).toEqual([
      '%fake.crm@example.com%',
    ]);
    expect(buildSearchPatterns('a%b_c\\d')).toEqual(['%a\\%b\\_c\\\\d%']);
  });
});

describe('parseBulkPersonIds', () => {
  test('deduplicates valid UUIDs', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(parseBulkPersonIds({ ids: [id, id] })).toEqual([id]);
  });

  test.each([
    [{}, 'ids must be a non-empty array'],
    [{ ids: [] }, 'ids must be a non-empty array'],
    [{ ids: ['not-a-uuid'] }, 'ids must contain valid UUIDs'],
    [
      {
        ids: Array.from(
          { length: 101 },
          (_, index) =>
            `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        ),
      },
      'ids must contain at most 100 items',
    ],
  ])('rejects invalid bulk IDs', (body, message) => {
    expect(() => parseBulkPersonIds(body)).toThrow(message);
  });
});

describe('business metrics helpers', () => {
  test.each([
    ['weekly', 52],
    ['monthly', 12],
    ['quarterly', 4],
    ['semi-annually', 2],
    ['semi-annual', 2],
    ['annually', 1],
    ['annual', 1],
    [null, 12],
  ])('annualizes a %s premium', (frequency, expected) => {
    expect(
      annualizePremium({
        premium_amount: 1,
        premium_frequency: frequency,
      }),
    ).toBe(expected);
  });
});

describe('GET /people', () => {
  test('requires an agent profile', async () => {
    const supabase = makeSupabase({});
    const response = await request(makeApp(supabase, null)).get('/business');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Agent profile required' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns owned people with pagination and sorting', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        {
          data: [{ client_id: 'client-1' }, { client_id: 'client-1' }],
          error: null,
        },
      ],
      business: [
        {
          data: [{ id: 'person-1', first_name: 'Ada' }],
          error: null,
          count: 26,
        },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?page=2&limit=10&sortBy=last_name&sortOrder=asc');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: 'person-1', first_name: 'Ada' }],
      pagination: {
        page: 2,
        limit: 10,
        total: 26,
        totalPages: 3,
      },
    });

    const peopleQuery = findQuery(supabase, 'business');
    expect(peopleQuery.calls).toEqual(
      expect.arrayContaining([
        {
          method: 'select',
          args: [EXPECTED_LIST_FIELDS, { count: 'exact' }],
        },
        {
          method: 'or',
          args: ['and(client_id.is.null,agent_id.eq.agent-1),client_id.in.(client-1)'],
        },
        {
          method: 'order',
          args: [
            'last_name',
            { ascending: true, nullsFirst: false },
          ],
        },
        { method: 'range', args: [10, 19] },
      ]),
    );
  });

  test('filters by lifecycle status when requested', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      business: [
        {
          data: [{ id: 'person-1', lifecycle_status: 'SALE' }],
          error: null,
          count: 1,
        },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?status=sale');

    expect(response.status).toBe(200);
    const peopleQuery = findQuery(supabase, 'business');
    expect(peopleQuery.calls).toEqual(
      expect.arrayContaining([
        { method: 'eq', args: ['lifecycle_status', 'SALE'] },
      ]),
    );
  });

  test('limits the list to GSQ-sourced people when gsqOnly is set', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [{ client_id: 'client-1' }], error: null }],
      business: [{ data: [{ id: 'person-1' }], error: null, count: 1 }],
    });

    const response = await request(makeApp(supabase, { id: 'agent-1' })).get(
      '/business?gsqOnly=true',
    );

    expect(response.status).toBe(200);
    expect(findQuery(supabase, 'business').calls).toContainEqual({
      method: 'eq',
      args: ['lead_vendor_id', '1043bc55-a8cd-485f-bddc-46bcfc06d4ba'],
    });
  });

  test('omits the vendor filter unless gsqOnly is exactly true', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [{ client_id: 'client-1' }], error: null }],
      business: [{ data: [], error: null, count: 0 }],
    });

    await request(makeApp(supabase, { id: 'agent-1' })).get(
      '/business?gsqOnly=1',
    );

    const vendorCalls = findQuery(supabase, 'business').calls.filter(
      (call) => call.method === 'eq' && call.args[0] === 'lead_vendor_id',
    );
    expect(vendorCalls).toHaveLength(0);
  });

  test('omits the lifecycle filter by default', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      business: [
        { data: [], error: null, count: 0 },
      ],
    });

    await request(makeApp(supabase, { id: 'agent-1' })).get('/business');

    const peopleQuery = findQuery(supabase, 'business');
    const eqCalls = peopleQuery.calls.filter(
      (call) => call.method === 'eq' && call.args[0] === 'lifecycle_status',
    );
    expect(eqCalls).toHaveLength(0);
  });

  test('searches indexed lead and client text before the view', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      leads: [{ data: [{ id: 'lead-1' }], error: null }],
      clients: [{ data: [{ id: 'client-1' }], error: null }],
      business: [
        {
          data: [{ id: 'lead-1' }],
          error: null,
          count: 1,
        },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=(555)%20123-4567');

    expect(response.status).toBe(200);

    const leadQuery = findQuery(supabase, 'leads');
    const clientQuery = findQuery(supabase, 'clients');
    const peopleQuery = findQuery(supabase, 'business');

    expect(leadQuery.calls).toContainEqual({
      method: 'ilike',
      args: ['people_search_text', '%5551234567%'],
    });
    expect(leadQuery.calls).toContainEqual({
      method: 'eq',
      args: ['agent_id', 'agent-1'],
    });
    expect(clientQuery.calls).toContainEqual({
      method: 'ilike',
      args: ['people_search_text', '%5551234567%'],
    });
    expect(clientQuery.calls).toContainEqual({
      method: 'in',
      args: ['id', ['client-1']],
    });
    expect(peopleQuery.calls).toContainEqual({
      method: 'or',
      args: ['lead_id.in.(lead-1),client_id.in.(client-1)'],
    });
  });

  test('requires every search term to match', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      leads: [{ data: [{ id: 'lead-1' }], error: null }],
      business: [
        { data: [{ id: 'lead-1' }], error: null, count: 1 },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=CVerify%20Nadia');

    expect(response.status).toBe(200);
    const leadQuery = findQuery(supabase, 'leads');
    expect(leadQuery.calls).toContainEqual({
      method: 'ilike',
      args: ['people_search_text', '%cverify%'],
    });
    expect(leadQuery.calls).toContainEqual({
      method: 'ilike',
      args: ['people_search_text', '%nadia%'],
    });
  });

  test('escapes ilike wildcards in search patterns', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      leads: [{ data: [{ id: 'lead-1' }], error: null }],
      clients: [{ data: [], error: null }],
      business: [
        { data: [{ id: 'lead-1' }], error: null, count: 1 },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=a%25b_c');

    expect(response.status).toBe(200);
    expect(findQuery(supabase, 'leads').calls).toContainEqual({
      method: 'ilike',
      args: ['people_search_text', '%a\\%b\\_c%'],
    });
  });

  test('uses a compact view filter for broad indexed searches', async () => {
    const leadIds = Array.from(
      { length: 60 },
      (_, index) => ({ id: `lead-${index}` }),
    );
    const clientIds = Array.from(
      { length: 41 },
      (_, index) => ({ id: `client-${index}` }),
    );
    const supabase = makeSupabase({
      agent_clients: [
        {
          data: clientIds.map(({ id }) => ({ client_id: id })),
          error: null,
        },
      ],
      leads: [{ data: leadIds, error: null }],
      clients: [{ data: clientIds, error: null }],
      business: [{ data: [], error: null, count: 101 }],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=E2E');

    expect(response.status).toBe(200);
    const peopleQuery = findQuery(supabase, 'business');
    expect(peopleQuery.calls).toContainEqual({
      method: 'ilike',
      args: ['search_text', '%e2e%'],
    });
    expect(
      peopleQuery.calls.some(({ args }) =>
        String(args[0]).includes('lead_id.in.'),
      ),
    ).toBe(false);
  });

  test('returns an empty page without querying the view when search misses', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      leads: [{ data: [], error: null }],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=nobody');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
      },
    });
    expect(supabase.from).not.toHaveBeenCalledWith('people');
  });

  test('returns an empty page when the requested range is past the end', async () => {
    const rangeError = {
      code: 'PGRST103',
      message: 'Requested range not satisfiable',
    };
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      leads: [{ data: [{ id: 'lead-1' }], error: null }],
      clients: [{ data: [{ id: 'client-1' }], error: null }],
      business: [
        { data: null, error: rangeError, count: null },
        { data: null, error: null, count: 16 },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?search=Ada&page=5&limit=5');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      pagination: {
        page: 5,
        limit: 5,
        total: 16,
        totalPages: 4,
      },
    });

    const countQuery = findQuery(supabase, 'business', 1);
    expect(countQuery.calls).toEqual(
      expect.arrayContaining([
        {
          method: 'select',
          args: ['id', { count: 'exact', head: true }],
        },
        {
          method: 'or',
          args: ['and(client_id.is.null,agent_id.eq.agent-1),client_id.in.(client-1)'],
        },
        {
          method: 'or',
          args: ['lead_id.in.(lead-1),client_id.in.(client-1)'],
        },
      ]),
    );
  });

  test('lets the existing superuser query all matching people', async () => {
    const supabase = makeSupabase({
      leads: [
        { data: [{ id: 'lead-1' }], error: null },
        { data: [], error: null },
      ],
      clients: [
        { data: [{ id: 'client-1' }], error: null },
        { data: [], error: null },
      ],
      business: [{ data: [], error: null, count: 0 }],
    });

    const response = await request(
      makeApp(supabase, { id: SUPERUSER_ID }),
    ).get('/business?search=Ada');

    expect(response.status).toBe(200);
    expect(supabase.from).not.toHaveBeenCalledWith('agent_clients');

    const clientQuery = findQuery(supabase, 'clients');
    expect(clientQuery.calls.some(({ method }) => method === 'in')).toBe(false);

    const peopleQuery = findQuery(supabase, 'business');
    expect(
      peopleQuery.calls.some(
        ({ method, args }) =>
          method === 'or' && args[0].includes('agent_id.eq.'),
      ),
    ).toBe(false);
  });

  test('returns 400 for invalid pagination without querying Supabase', async () => {
    const supabase = makeSupabase({});
    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business?limit=500');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'limit must be at most 100',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns a sanitized error when Supabase fails', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: null, error: new Error('database unavailable') },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch business records' });
  });
});

describe('GET /business/metrics', () => {
  test('requires an agent profile', async () => {
    const supabase = makeSupabase({});
    const response = await request(makeApp(supabase, null)).get(
      '/business/metrics',
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Agent profile required' });
  });

  test('returns all-time metrics with Stripe-derived lead spend', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        {
          data: [{ client_id: 'client-1' }, { client_id: 'client-2' }],
          error: null,
        },
      ],
      leads: [{ data: null, error: null, count: 3 }],
      business: [
        {
          data: [{ client_id: 'client-1' }, { client_id: 'client-2' }],
          error: null,
        },
      ],
      policies: [
        {
          data: [
            { premium_amount: 10, premium_frequency: 'monthly' },
            { premium_amount: 20, premium_frequency: 'quarterly' },
            { premium_amount: 30, premium_frequency: 'semi-annually' },
            { premium_amount: 40, premium_frequency: 'annually' },
            { premium_amount: 5, premium_frequency: 'weekly' },
          ],
          error: null,
        },
      ],
    });
    const firestore = makeFirestore({
      'agent-1@example.com': [{ amountPaid: 100 }, { amountPaid: 56 }],
    });

    const response = await request(
      makeApp(
        supabase,
        { id: 'agent-1', email: 'Agent-1@Example.com' },
        firestore,
      ),
    ).get('/business/metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        leadsDelivered: 3,
        closedSales: 5,
        totalClosed: 560,
        leadSpend: 156,
        roiNet: 404,
        roiMultiplier: 3.59,
      },
    });

    // The Stripe lookup lowercases the account email before matching.
    expect(firestore.calls).toEqual([
      {
        name: 'stripe_orders',
        field: 'email',
        op: '==',
        value: 'agent-1@example.com',
      },
    ]);

    // Leads are scoped to the requesting agent for non-superusers.
    const leadsQuery = findQuery(supabase, 'leads');
    expect(leadsQuery.calls).toContainEqual({
      method: 'eq',
      args: ['agent_id', 'agent-1'],
    });
  });

  test('superuser skips ownership scoping and reads all policies', async () => {
    const supabase = makeSupabase({
      leads: [{ data: null, error: null, count: 10 }],
      policies: [
        {
          data: [{ premium_amount: 100, premium_frequency: 'annually' }],
          error: null,
        },
      ],
    });
    const firestore = makeFirestore({
      'super@example.com': [{ amountPaid: 50 }],
    });

    const response = await request(
      makeApp(
        supabase,
        { id: SUPERUSER_ID, email: 'super@example.com' },
        firestore,
      ),
    ).get('/business/metrics');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      leadsDelivered: 10,
      closedSales: 1,
      totalClosed: 100,
      leadSpend: 50,
      roiNet: 50,
      roiMultiplier: 2,
    });

    // No ownership lookups for the superuser.
    expect(findQuery(supabase, 'agent_clients')).toBeUndefined();
    const leadsQuery = findQuery(supabase, 'leads');
    expect(leadsQuery.calls).not.toContainEqual({
      method: 'eq',
      args: ['agent_id', SUPERUSER_ID],
    });
  });

  test('reports a null multiplier when there is no spend', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      leads: [{ data: null, error: null, count: 0 }],
      business: [{ data: [], error: null }],
    });
    const firestore = makeFirestore({});

    const response = await request(
      makeApp(
        supabase,
        { id: 'agent-1', email: 'agent-1@example.com' },
        firestore,
      ),
    ).get('/business/metrics');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      leadsDelivered: 0,
      closedSales: 0,
      totalClosed: 0,
      leadSpend: 0,
      roiNet: 0,
      roiMultiplier: null,
    });
  });

  test('returns 500 when the Stripe order lookup fails', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      leads: [{ data: null, error: null, count: 0 }],
      business: [{ data: [], error: null }],
    });
    const firestore = makeFirestore({}, { error: new Error('firestore down') });

    const response = await request(
      makeApp(
        supabase,
        { id: 'agent-1', email: 'agent-1@example.com' },
        firestore,
      ),
    ).get('/business/metrics');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to fetch business metrics',
    });
  });

  test('returns 500 when a supabase query fails', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      leads: [{ data: null, error: { message: 'boom' }, count: null }],
      business: [{ data: [], error: null }],
    });

    const response = await request(
      makeApp(
        supabase,
        { id: 'agent-1', email: 'agent-1@example.com' },
        makeFirestore({}),
      ),
    ).get('/business/metrics');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to fetch business metrics',
    });
  });
});

describe('PATCH /business/:id/notes', () => {
  test('writes notes to the client row for a converted sale', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [{ client_id: 'client-1' }], error: null }],
      business: [
        {
          data: {
            id: 'client-1',
            lead_id: 'lead-1',
            client_id: 'client-1',
          },
          error: null,
        },
      ],
      clients: [{ data: null, error: null }],
    });

    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .patch('/business/client-1/notes')
      .send({ notes: 'called, follow up friday' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { id: 'client-1', notes: 'called, follow up friday' },
    });

    const updateQuery = findQuery(supabase, 'clients');
    expect(updateQuery.calls).toContainEqual({
      method: 'update',
      args: [{ notes: 'called, follow up friday' }],
    });
    expect(updateQuery.calls).toContainEqual({
      method: 'eq',
      args: ['id', 'client-1'],
    });
  });

  test('writes notes to the lead row before conversion', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [
        {
          data: { id: 'lead-1', lead_id: 'lead-1', client_id: null },
          error: null,
        },
      ],
      leads: [{ data: null, error: null }],
    });

    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .patch('/business/lead-1/notes')
      .send({ notes: 'left voicemail' });

    expect(response.status).toBe(200);
    const updateQuery = findQuery(supabase, 'leads');
    expect(updateQuery.calls).toContainEqual({
      method: 'update',
      args: [{ notes: 'left voicemail' }],
    });
  });

  test('rejects non-string notes', async () => {
    const supabase = makeSupabase({});
    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .patch('/business/lead-1/notes')
      .send({ notes: 42 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'notes must be a string' });
  });

  test('404s for a person outside the agent scope', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [{ data: null, error: null }],
    });

    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .patch('/business/other/notes')
      .send({ notes: 'nope' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Person not found' });
  });
});

describe('POST /business/release-notifications', () => {
  test('upserts the signup under the normalized email', async () => {
    const supabase = makeSupabase({
      release_notifications_subscribers: [{ data: null, error: null }],
    });

    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .post('/business/release-notifications')
      .send({ email: ' Agent-1@Example.COM ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { email: 'agent-1@example.com' },
    });

    const upsertQuery = findQuery(
      supabase,
      'release_notifications_subscribers',
    );
    expect(upsertQuery.calls).toContainEqual({
      method: 'upsert',
      args: [
        {
          email: 'agent-1@example.com',
          feature: 'business_quick_actions',
          agent_id: 'agent-1',
        },
        { onConflict: 'email,feature', ignoreDuplicates: true },
      ],
    });
  });

  test('falls back to the logged-in account email', async () => {
    const supabase = makeSupabase({
      release_notifications_subscribers: [{ data: null, error: null }],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1', email: 'agent-1@example.com' }),
    )
      .post('/business/release-notifications')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { email: 'agent-1@example.com' },
    });
  });

  test('rejects an invalid email', async () => {
    const supabase = makeSupabase({});
    const response = await request(makeApp(supabase, { id: 'agent-1' }))
      .post('/business/release-notifications')
      .send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'A valid email is required' });
  });
});

describe('GET /people/:id', () => {
  test('returns complete details for an owned person', async () => {
    const person = {
      id: 'client-1',
      first_name: 'Ada',
      availability: 'Weekdays after 3 PM',
      policies: [
        {
          id: 'policy-1',
          carrier_name: 'Example Carrier',
          product_name: 'Example Product',
          beneficiaries: [
            {
              id: 'beneficiary-1',
              first_name: 'Grace',
              beneficiary_type: 'primary',
            },
          ],
        },
      ],
    };
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: 'client-1' }], error: null },
      ],
      business: [{ data: person, error: null }],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business/client-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: person });

    const peopleQuery = findQuery(supabase, 'business');
    expect(peopleQuery.calls).toEqual(
      expect.arrayContaining([
        {
          method: 'select',
          args: [EXPECTED_DETAIL_FIELDS],
        },
        {
          method: 'eq',
          args: ['id', 'client-1'],
        },
        {
          method: 'or',
          args: ['and(client_id.is.null,agent_id.eq.agent-1),client_id.in.(client-1)'],
        },
        {
          method: 'maybeSingle',
          args: [],
        },
      ]),
    );
  });

  test('returns 404 without exposing an unowned person', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [{ data: null, error: null }],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business/client-2');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Person not found' });

    const peopleQuery = findQuery(supabase, 'business');
    expect(peopleQuery.calls).toContainEqual({
      method: 'eq',
      args: ['agent_id', 'agent-1'],
    });
  });

  test('lets the existing superuser fetch any person', async () => {
    const person = { id: 'client-2', policies: [] };
    const supabase = makeSupabase({
      business: [{ data: person, error: null }],
    });

    const response = await request(
      makeApp(supabase, { id: SUPERUSER_ID }),
    ).get('/business/client-2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: person });
    expect(supabase.from).not.toHaveBeenCalledWith('agent_clients');

    const peopleQuery = findQuery(supabase, 'business');
    expect(
      peopleQuery.calls.some(({ method }) => method === 'or'),
    ).toBe(false);
  });

  test('requires an agent profile', async () => {
    const supabase = makeSupabase({});

    const response = await request(
      makeApp(supabase, null),
    ).get('/business/person-1');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Agent profile required' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns a sanitized error when the detail query fails', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [
        { data: null, error: new Error('database unavailable') },
      ],
    });

    const response = await request(
      makeApp(supabase, { id: 'agent-1' }),
    ).get('/business/person-1');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to fetch person',
    });
  });
});

describe('DELETE /people', () => {
  const leadOnlyId = '11111111-1111-4111-8111-111111111111';
  const clientId = '22222222-2222-4222-8222-222222222222';
  const saleLeadId = '33333333-3333-4333-8333-333333333333';
  const policyId = '44444444-4444-4444-8444-444444444444';

  test('deletes mixed owned rows and removes an orphaned sale lead', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: clientId }], error: null },
        { data: null, error: null },
      ],
      business: [
        {
          data: [
            {
              id: leadOnlyId,
              lead_id: leadOnlyId,
              client_id: null,
              lifecycle_status: 'LEAD',
            },
            {
              id: clientId,
              lead_id: saleLeadId,
              client_id: clientId,
              lifecycle_status: 'SALE',
            },
          ],
          error: null,
        },
      ],
      policies: [
        { data: [{ id: policyId }], error: null },
        { data: null, error: null },
      ],
      beneficiaries: [{ data: null, error: null }],
      clients: [
        { data: null, error: null },
        { data: [], error: null },
      ],
      leads: [{ data: null, error: null }],
    });
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [leadOnlyId, clientId] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      deletedIds: [leadOnlyId, clientId],
    });
    expect(findQuery(supabase, 'beneficiaries').calls).toContainEqual({
      method: 'in',
      args: ['policy_id', [policyId]],
    });
    expect(findQuery(supabase, 'clients').calls).toContainEqual({
      method: 'in',
      args: ['id', [clientId]],
    });
    expect(findQuery(supabase, 'leads').calls).toContainEqual({
      method: 'in',
      args: ['id', [leadOnlyId, saleLeadId]],
    });
  });

  test('retains a shared lead while another family client remains', async () => {
    const supabase = makeSupabase({
      agent_clients: [
        { data: [{ client_id: clientId }], error: null },
        { data: null, error: null },
      ],
      business: [
        {
          data: [
            {
              id: clientId,
              lead_id: saleLeadId,
              client_id: clientId,
              lifecycle_status: 'SALE',
            },
          ],
          error: null,
        },
      ],
      policies: [
        { data: [], error: null },
        { data: null, error: null },
      ],
      clients: [
        { data: null, error: null },
        { data: [{ lead_id: saleLeadId }], error: null },
      ],
    });
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [clientId] });

    expect(response.status).toBe(200);
    expect(supabase.from).not.toHaveBeenCalledWith('leads');
  });

  test('rejects the whole request when any selected row is unowned', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [
        {
          data: [
            {
              id: leadOnlyId,
              lead_id: leadOnlyId,
              client_id: null,
              lifecycle_status: 'LEAD',
            },
          ],
          error: null,
        },
      ],
    });
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [leadOnlyId, clientId] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'One or more people were not found',
    });
    expect(supabase.from).not.toHaveBeenCalledWith('policies');
    expect(supabase.from).not.toHaveBeenCalledWith('clients');
    expect(supabase.from).not.toHaveBeenCalledWith('leads');
  });

  test('excludes a mismatched SALE at the ownership filter, so its delete 404s', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [], error: null }],
      business: [{ data: [], error: null }],
    });
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [clientId] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'One or more people were not found',
    });
    expect(findQuery(supabase, 'business').calls).toContainEqual({
      method: 'is',
      args: ['client_id', null],
    });
    expect(findQuery(supabase, 'business').calls).toContainEqual({
      method: 'eq',
      args: ['agent_id', 'agent-1'],
    });
    expect(supabase.from).not.toHaveBeenCalledWith('policies');
    expect(supabase.from).not.toHaveBeenCalledWith('clients');
    expect(supabase.from).not.toHaveBeenCalledWith('leads');
  });

  test('allows the superuser to delete sales linked to any agent', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: null, error: null }],
      business: [
        {
          data: [
            {
              id: clientId,
              lead_id: saleLeadId,
              client_id: clientId,
              lifecycle_status: 'SALE',
            },
          ],
          error: null,
        },
      ],
      policies: [
        { data: [], error: null },
        { data: null, error: null },
      ],
      clients: [
        { data: null, error: null },
        { data: [], error: null },
      ],
      leads: [{ data: null, error: null }],
    });
    const app = makeApp(supabase, { id: SUPERUSER_ID });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [clientId] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedIds: [clientId] });
  });

  test('requires an agent profile', async () => {
    const supabase = makeSupabase({});
    const response = await request(makeApp(supabase, null))
      .delete('/business')
      .send({ ids: [clientId] });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Agent profile required' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns a sanitized 500 when the cascade fails midway', async () => {
    const supabase = makeSupabase({
      agent_clients: [{ data: [{ client_id: clientId }], error: null }],
      business: [
        {
          data: [
            {
              id: clientId,
              lead_id: saleLeadId,
              client_id: clientId,
              lifecycle_status: 'SALE',
            },
          ],
          error: null,
        },
      ],
      policies: [{ data: [{ id: policyId }], error: null }],
      beneficiaries: [
        { data: null, error: new Error('beneficiaries delete failed') },
      ],
    });
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: [clientId] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to delete business records' });
    expect(supabase.from).not.toHaveBeenCalledWith('leads');
  });

  test('rejects malformed IDs before querying Supabase', async () => {
    const supabase = { from: jest.fn() };
    const app = makeApp(supabase, { id: 'agent-1' });

    const response = await request(app)
      .delete('/business')
      .send({ ids: ['bad-id'] });

    expect(response.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
