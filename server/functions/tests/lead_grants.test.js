/* global jest, describe, test, expect, beforeEach */

const express = require('express');
const request = require('supertest');
const { FieldValue } = require('@google-cloud/firestore');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { createLeadGrantsRouter } = require('../endpoints/lead_grants');

const ADMIN_ID = '0a0a0a0a-0000-4000-8000-000000000001';
const AGENT_ID = '0b0b0b0b-0000-4000-8000-000000000002';
const AGENT = { id: AGENT_ID, email: ' Pat@Example.com ' };
const EMAIL = 'pat@example.com';

// Each entry is the result of one `supabase.from(table)` call, in order.
// Every query is awaitable and has maybeSingle()/single(); the builder calls
// are kept so a test can read what was upserted.
const makeSupabase = (results) => {
  const queries = [];
  const from = jest.fn((table) => {
    const result = results[queries.length] || { data: null, error: null };
    const query = { table };
    for (const name of ['select', 'upsert', 'eq', 'order', 'limit']) {
      query[name] = jest.fn(() => query);
    }
    query.maybeSingle = jest.fn().mockResolvedValue(result);
    query.single = jest.fn().mockResolvedValue(result);
    query.then = (resolve, reject) =>
      Promise.resolve(result).then(resolve, reject);
    queries.push(query);
    return query;
  });
  return { from, queries };
};

// Fake GSQ Firestore: `docs` maps 'collection/id' to the doc's data; a path
// not listed does not exist. runTransaction runs the callback once and keeps
// what it wrote: tx.update / tx.create calls are recorded per path, and a
// committed create is visible to the next request (so retries can be tested).
// `commitError` makes the transaction fail after the callback.
const makeFirestore = ({ docs = {}, commitError } = {}) => {
  const store = { ...docs };
  const updates = {};
  const creates = {};
  const snapshot = (path) => ({
    exists: store[path] !== undefined,
    get: (field) => store[path]?.[field],
    data: () => store[path],
  });
  const createFirestore = jest.fn(() => ({
    doc: (path) => ({ path }),
    runTransaction: async (fn) => {
      const pending = [];
      const tx = {
        get: async (ref) => snapshot(ref.path),
        update: (ref, data) => pending.push(['update', ref.path, data]),
        create: (ref, data) => pending.push(['create', ref.path, data]),
      };
      const result = await fn(tx);
      if (commitError) throw commitError;
      for (const [kind, path, data] of pending) {
        const log = kind === 'update' ? updates : creates;
        (log[path] = log[path] || []).push(data);
        if (kind === 'create') store[path] = data;
      }
      return result;
    },
  }));
  createFirestore.updates = updates;
  createFirestore.creates = creates;
  return createFirestore;
};

const ALL_LEDGERS = {
  [`agents/${EMAIL}`]: { outstandingLeads: 0, verified: 0, unverified: 0 },
  [`instant_forms/${EMAIL}`]: { outstandingInstantForms: 0 },
  [`live_transfers/${EMAIL}`]: { outstandingLiveTransfers: 0 },
  [`keyley/${EMAIL}`]: { outstandingKeyley: 0 },
};

const GRANT_ID = '0c0c0c0c-0000-4000-8000-000000000003';

const makeApp = ({ supabase, createFirestore, role = 'admin' }) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = { id: ADMIN_ID };
    req.user = { role };
    next();
  });
  app.use(
    '/lead-grants',
    createLeadGrantsRouter({ supabase, createFirestore }),
  );
  return app;
};

const body = (overrides = {}) => ({
  id: GRANT_ID,
  agentId: AGENT_ID,
  leadType: 'gsq_verified',
  quantity: 2,
  reason: '  2 leads over age 85  ',
  ...overrides,
});

const agentFound = { data: AGENT, error: null };
const inserted = (row = { id: 'g1' }) => ({ data: row, error: null });

describe('POST /lead-grants', () => {
  let supabase;
  let createFirestore;
  beforeEach(() => {
    supabase = makeSupabase([agentFound, inserted()]);
    createFirestore = makeFirestore({ docs: ALL_LEDGERS });
  });

  const post = (payload, opts = {}) =>
    request(makeApp({ supabase, createFirestore, ...opts }))
      .post('/lead-grants')
      .send(payload);

  test('non-admin gets 403 and nothing happens', async () => {
    const res = await post(body(), { role: 'agent' });
    expect(res.status).toBe(403);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test.each([
    ['id missing', { id: undefined }],
    ['id not a uuid', { id: 'abc' }],
    ['agentId missing', { agentId: undefined }],
    ['agentId not a uuid', { agentId: 'abc' }],
    ['unknown leadType', { leadType: 'web' }],
    ['old leadType name', { leadType: 'web_verified' }],
    ['quantity 0', { quantity: 0 }],
    ['quantity 101', { quantity: 101 }],
    ['quantity a fraction', { quantity: 1.5 }],
    ['quantity a string', { quantity: '2' }],
    ['reason blank', { reason: '   ' }],
    ['reason missing', { reason: undefined }],
    ['reason over 500 chars', { reason: 'x'.repeat(501) }],
  ])('%s is a 400', async (_, overrides) => {
    const res = await post(body(overrides));
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('an unknown agent is a 404', async () => {
    supabase = makeSupabase([{ data: null, error: null }]);
    const res = await post(body());
    expect(res.status).toBe(404);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('an agent lookup error is a 500 and nothing is credited', async () => {
    supabase = makeSupabase([{ data: null, error: { message: 'down' } }]);
    const res = await post(body());
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Could not look up the agent');
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('an agent with no email is a 400', async () => {
    supabase = makeSupabase([
      { data: { id: AGENT_ID, email: ' ' }, error: null },
    ]);
    const res = await post(body());
    expect(res.status).toBe(400);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test.each([
    ['gsq_verified', 'agents', 'web lead'],
    ['gsq_unverified', 'agents', 'web lead'],
    ['keyley_verified', 'keyley', 'Keyley lead'],
    ['gsq_instant_form', 'instant_forms', 'instant form'],
    ['gsq_live_transfer', 'live_transfers', 'live transfer'],
  ])(
    '%s with no ledger doc is a 409',
    async (leadType, collection, product) => {
      createFirestore = makeFirestore({ docs: {} });
      const res = await post(body({ leadType }));
      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        `This agent has no GSQ ${product} balance yet`,
      );
      expect(createFirestore.updates[`${collection}/${EMAIL}`]).toBeUndefined();
      expect(createFirestore.creates[`lead_grants/${GRANT_ID}`]).toBeUndefined();
      expect(supabase.queries).toHaveLength(1);
    },
  );

  test('a ledger doc without the counter is a 409', async () => {
    createFirestore = makeFirestore({
      docs: { [`agents/${EMAIL}`]: { name: 'x' } },
    });
    const res = await post(body());
    expect(res.status).toBe(409);
  });

  test.each([
    ['gsq_verified', 'agents', ['verified', 'outstandingLeads']],
    ['gsq_unverified', 'agents', ['unverified', 'outstandingLeads']],
    ['keyley_verified', 'keyley', ['outstandingKeyley']],
    ['gsq_instant_form', 'instant_forms', ['outstandingInstantForms']],
    ['gsq_live_transfer', 'live_transfers', ['outstandingLiveTransfers']],
  ])(
    '%s increments exactly %s %j by n',
    async (leadType, collection, fields) => {
      const row = { id: 'g1', lead_type: leadType };
      supabase = makeSupabase([agentFound, inserted(row)]);
      const res = await post(body({ leadType, quantity: 3 }));
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ data: row });

      expect(createFirestore.updates[`${collection}/${EMAIL}`]).toEqual([
        Object.fromEntries(fields.map((f) => [f, FieldValue.increment(3)])),
      ]);
      expect(createFirestore.creates[`lead_grants/${GRANT_ID}`]).toEqual([
        {
          agentId: AGENT_ID,
          agentEmail: EMAIL,
          leadType,
          quantity: 3,
          reason: '2 leads over age 85',
          givenBy: ADMIN_ID,
          createdAt: FieldValue.serverTimestamp(),
        },
      ]);

      const upsert = supabase.queries[1];
      expect(upsert.table).toBe('lead_grants');
      expect(upsert.upsert).toHaveBeenCalledWith(
        {
          id: GRANT_ID,
          agent_id: AGENT_ID,
          agent_email: EMAIL,
          lead_type: leadType,
          quantity: 3,
          reason: '2 leads over age 85',
          given_by: ADMIN_ID,
        },
        { onConflict: 'id' },
      );
    },
  );

  test('a Firestore failure is a 502 and no row is written', async () => {
    createFirestore = makeFirestore({
      docs: ALL_LEDGERS,
      commitError: new Error('unavailable'),
    });
    const res = await post(body());
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Could not add the leads; nothing was given');
    expect(supabase.queries).toHaveLength(1);
  });

  test('an upsert failure after the credit is a 500 that says Retry is safe', async () => {
    supabase = makeSupabase([
      agentFound,
      { data: null, error: { message: 'boom' } },
    ]);
    const res = await post(body());
    expect(res.status).toBe(500);
    expect(res.body.error).toBe(
      'The leads were added but the record did not save. Press Retry to finish; it will not add them again.',
    );
    expect(createFirestore.updates[`agents/${EMAIL}`]).toHaveLength(1);
  });

  test('a retry with the same id adds nothing again and fills in the row', async () => {
    supabase = makeSupabase([
      agentFound,
      { data: null, error: { message: 'boom' } },
      agentFound,
      inserted({ id: GRANT_ID }),
    ]);
    const first = await post(body());
    expect(first.status).toBe(500);

    const retry = await post(body());
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ data: { id: GRANT_ID } });
    // the ledger was credited once, by the first request
    expect(createFirestore.updates[`agents/${EMAIL}`]).toHaveLength(1);
    expect(createFirestore.creates[`lead_grants/${GRANT_ID}`]).toHaveLength(1);
    expect(supabase.queries[3].upsert.mock.calls[0][0].id).toBe(GRANT_ID);
  });

  test('a second success with the same id is a 200 and credits nothing', async () => {
    supabase = makeSupabase([
      agentFound,
      inserted({ id: GRANT_ID }),
      agentFound,
      inserted({ id: GRANT_ID }),
    ]);
    expect((await post(body())).status).toBe(201);
    expect((await post(body())).status).toBe(200);
    expect(createFirestore.updates[`agents/${EMAIL}`]).toHaveLength(1);
  });

  test('an id reused for a different grant is a 409 and credits nothing', async () => {
    createFirestore = makeFirestore({
      docs: {
        ...ALL_LEDGERS,
        [`lead_grants/${GRANT_ID}`]: {
          agentEmail: EMAIL,
          leadType: 'gsq_verified',
          quantity: 5,
        },
      },
    });
    const res = await post(body({ quantity: 2 }));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      'This grant id was already used for a different grant',
    );
    expect(createFirestore.updates[`agents/${EMAIL}`]).toBeUndefined();
    expect(supabase.queries).toHaveLength(1);
  });
});

describe('GET /lead-grants', () => {
  test('non-admin gets 403', async () => {
    const supabase = makeSupabase([]);
    const res = await request(
      makeApp({ supabase, createFirestore: makeFirestore(), role: 'agent' }),
    ).get('/lead-grants');
    expect(res.status).toBe(403);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns the newest 100, newest first, with names', async () => {
    const rows = [
      { id: 'g2', created_at: '2026-11-22T00:00:00Z' },
      { id: 'g1', created_at: '2026-11-21T00:00:00Z' },
    ];
    const supabase = makeSupabase([{ data: rows, error: null }]);
    const res = await request(
      makeApp({ supabase, createFirestore: makeFirestore() }),
    ).get('/lead-grants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: rows });
    const query = supabase.queries[0];
    expect(query.table).toBe('lead_grants');
    expect(query.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(100);
    expect(query.select.mock.calls[0][0]).toContain(
      'agent:agents!lead_grants_agent_id_fkey',
    );
    expect(query.select.mock.calls[0][0]).toContain(
      'given_by_agent:agents!lead_grants_given_by_fkey',
    );
  });
});
