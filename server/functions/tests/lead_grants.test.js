/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');
const { FieldValue } = require('@google-cloud/firestore');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { createLeadGrantsRouter } = require('../endpoints/lead_grants');
const { SUPER_ADMIN_EMAIL } = require('../integrations/GSQ');

const ADMIN_ID = '0a0a0a0a-0000-4000-8000-000000000001';
const AGENT_ID = '0b0b0b0b-0000-4000-8000-000000000002';
const GRANT_ID = '6f1c2a34-1b2c-4d5e-8f90-123456789abc';

// a Firestore error with its gRPC status code
const grpcError = (code, message) =>
  Object.assign(new Error(message), { code });

// Each entry is one `supabase.from(table)` call, in the order the route
// under test is expected to make them. Every query is awaitable directly
// and also exposes maybeSingle()/single(); all resolve `result`. Each query
// keeps its builder calls so a test can read what was inserted or updated.
const makeSupabase = (calls) => {
  let index = 0;
  const queries = [];
  const from = jest.fn((table) => {
    const call = calls[index];
    index += 1;
    const result = call ? call.result : { data: null, error: null };
    const query = {
      table,
      expected: call?.table,
      select: jest.fn(() => query),
      insert: jest.fn(() => query),
      update: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue(result),
      single: jest.fn().mockResolvedValue(result),
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    queries.push(query);
    return query;
  });
  return { from, queries, callCount: () => index };
};

// Fake GSQ Firestore: `docs` maps a path ('agents/<email>') to the doc's
// data, or to true for a ledger doc with its counters at 0; a path that is
// not listed does not exist. Every doc ref is kept so a test can read the
// update it got.
const LEDGER_COUNTERS = {
  outstandingLeads: 0,
  verified: 0,
  unverified: 0,
  outstandingInstantForms: 0,
  outstandingLiveTransfers: 0,
};
const makeFirestore = ({ docs = {}, update } = {}) => {
  const refs = {};
  const doc = jest.fn((path) => {
    const exists = Object.prototype.hasOwnProperty.call(docs, path);
    const data = docs[path] === true ? LEDGER_COUNTERS : docs[path];
    const ref = {
      get: jest.fn().mockResolvedValue({
        exists,
        get: (field) => (exists ? data?.[field] : undefined),
      }),
      update: update || jest.fn().mockResolvedValue(undefined),
    };
    refs[path] = ref;
    return ref;
  });
  const createFirestore = jest.fn(() => ({ doc }));
  createFirestore.refs = refs;
  createFirestore.doc = doc;
  return createFirestore;
};

const makeApp = ({
  supabase,
  createFirestore = makeFirestore(),
  agent = { id: ADMIN_ID, email: 'admin@example.com' },
  role = 'admin',
  user = true,
}) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    if (user) req.user = { id: agent?.id || 'auth-user-1', role };
    next();
  });
  app.use('/lead-grants', createLeadGrantsRouter({ supabase, createFirestore }));
  return app;
};

const AGENT = {
  id: AGENT_ID,
  first_name: 'Shea',
  last_name: 'Morales',
  email: ' Shea@Example.com ',
};
const EMAIL = 'shea@example.com';

const webGrant = (overrides = {}) => ({
  requestId: GRANT_ID,
  agentId: AGENT_ID,
  product: 'web',
  verified: 2,
  unverified: 0,
  reason: 'bad_lead_make_good',
  note: '  received 2 verified leads over the age of 85  ',
  ...overrides,
});

const pendingRow = (overrides = {}) => ({
  id: GRANT_ID,
  status: 'pending',
  agent_email: EMAIL,
  ...overrides,
});

// the four supabase calls of a grant that goes through: agent lookup,
// insert pending, mark credited
const happyCalls = (row = pendingRow()) => [
  { table: 'agents', result: { data: AGENT, error: null } },
  { table: 'lead_grants', result: { data: row, error: null } },
  {
    table: 'lead_grants',
    result: {
      data: { ...row, status: 'credited', credited_at: '2026-11-21T00:00:00Z' },
      error: null,
    },
  },
];

describe('access', () => {
  test('POST without an admin role on the request is forbidden', async () => {
    const supabase = makeSupabase([]);
    const app = makeApp({ supabase, user: false });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(403);
    expect(supabase.callCount()).toBe(0);
  });

  test('POST by an agent who is not an admin is forbidden', async () => {
    const supabase = makeSupabase([]);
    const createFirestore = makeFirestore({ docs: { [`agents/${EMAIL}`]: true } });
    const app = makeApp({ supabase, createFirestore, role: 'agent' });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(403);
    expect(supabase.callCount()).toBe(0);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('POST by an admin with no agent profile is refused, so granted_by is never empty', async () => {
    const supabase = makeSupabase([]);
    const createFirestore = makeFirestore({ docs: { [`agents/${EMAIL}`]: true } });
    const app = makeApp({ supabase, createFirestore, agent: null });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Agent profile required/);
    expect(supabase.callCount()).toBe(0);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('GET by an agent who is not an admin is forbidden', async () => {
    const supabase = makeSupabase([]);
    const app = makeApp({ supabase, role: 'agent' });
    const res = await request(app).get('/lead-grants');
    expect(res.status).toBe(403);
    expect(supabase.callCount()).toBe(0);
  });
});

describe('POST /lead-grants validation', () => {
  const cases = [
    ['missing agentId', webGrant({ agentId: undefined }), /agentId/],
    ['agentId that is not a uuid', webGrant({ agentId: 'abc' }), /agentId/],
    ['unknown product', webGrant({ product: 'aged' }), /product/],
    ['web with no leads', webGrant({ verified: 0, unverified: 0 }), /at least 1/i],
    ['web with a fraction', webGrant({ verified: 1.5 }), /whole numbers/],
    ['web with a negative count', webGrant({ verified: 3, unverified: -1 }), /whole numbers/],
    ['web with a string count', webGrant({ verified: '2' }), /whole numbers/],
    ['web over 100 in one field', webGrant({ verified: 101 }), /whole numbers/],
    ['web over 100 in total', webGrant({ verified: 60, unverified: 41 }), /At most 100/],
    ['web with count', webGrant({ count: 2 }), /not count/],
    [
      'instant form with verified',
      webGrant({ product: 'instant_form', verified: 2, unverified: undefined, count: 2 }),
      /only to web/,
    ],
    [
      'instant form with no count',
      webGrant({ product: 'instant_form', verified: undefined, unverified: undefined }),
      /count/,
    ],
    [
      'live transfer with count 0',
      webGrant({ product: 'live_transfer', verified: undefined, unverified: undefined, count: 0 }),
      /at least 1/i,
    ],
    [
      'live transfer over 100',
      webGrant({ product: 'live_transfer', verified: undefined, unverified: undefined, count: 101 }),
      /count/,
    ],
    ['unknown reason', webGrant({ reason: 'because' }), /reason/],
    ['missing reason', webGrant({ reason: undefined }), /reason/],
    ['missing note', webGrant({ note: undefined }), /note is required/],
    ['blank note', webGrant({ note: '   ' }), /note is required/],
    ['note too long', webGrant({ note: 'x'.repeat(501) }), /500/],
    ['requestId that is not a uuid', webGrant({ requestId: 'abc' }), /requestId/],
    ['missing requestId', webGrant({ requestId: undefined }), /requestId/],
  ];

  test.each(cases)('rejects %s', async (_, body, message) => {
    const supabase = makeSupabase([]);
    const createFirestore = makeFirestore();
    const app = makeApp({ supabase, createFirestore });
    const res = await request(app).post('/lead-grants').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
    expect(supabase.callCount()).toBe(0);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('accepts a note of exactly 500 characters after trimming', async () => {
    const supabase = makeSupabase(happyCalls());
    const createFirestore = makeFirestore({ docs: { [`agents/${EMAIL}`]: true } });
    const app = makeApp({ supabase, createFirestore });
    const res = await request(app)
      .post('/lead-grants')
      .send(webGrant({ note: `  ${'x'.repeat(500)}  ` }));
    expect(res.status).toBe(201);
  });

  test('404 when the agent does not exist', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: null, error: null } },
    ]);
    const createFirestore = makeFirestore();
    const app = makeApp({ supabase, createFirestore });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Agent not found/);
    expect(supabase.callCount()).toBe(1);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test('400 when the agent has no email', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: { ...AGENT, email: null }, error: null } },
    ]);
    const createFirestore = makeFirestore();
    const app = makeApp({ supabase, createFirestore });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no email/);
    expect(supabase.callCount()).toBe(1);
    expect(createFirestore).not.toHaveBeenCalled();
  });

  test.each([
    ['web', `agents/${EMAIL}`, /GSQ agent account/],
    ['instant_form', `instant_forms/${EMAIL}`, /instant form ledger/],
    ['live_transfer', `live_transfers/${EMAIL}`, /live transfer ledger/],
  ])('409 and no record when the %s ledger doc is missing', async (product, path, message) => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
    ]);
    const createFirestore = makeFirestore({ docs: {} });
    const app = makeApp({ supabase, createFirestore });
    const body =
      product === 'web'
        ? webGrant()
        : webGrant({ product, verified: undefined, unverified: undefined, count: 1 });
    const res = await request(app).post('/lead-grants').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(message);
    expect(createFirestore.doc).toHaveBeenCalledWith(path);
    expect(createFirestore.refs[path].update).not.toHaveBeenCalled();
    // only the agent lookup, nothing inserted
    expect(supabase.callCount()).toBe(1);
  });

  test.each([
    ['web', `agents/${EMAIL}`, { phone: '5555550100', sendBlueEnabled: true }],
    ['instant_form', `instant_forms/${EMAIL}`, { lastIssuedDate: 'x' }],
    ['live_transfer', `live_transfers/${EMAIL}`, { lastDialedDate: 'x' }],
  ])('409 and no record when the %s ledger doc has no counter (a stub)', async (product, path, data) => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
    ]);
    const createFirestore = makeFirestore({ docs: { [path]: data } });
    const app = makeApp({ supabase, createFirestore });
    const body =
      product === 'web'
        ? webGrant()
        : webGrant({ product, verified: undefined, unverified: undefined, count: 1 });
    const res = await request(app).post('/lead-grants').send(body);
    expect(res.status).toBe(409);
    expect(createFirestore.refs[path].update).not.toHaveBeenCalled();
    expect(supabase.callCount()).toBe(1);
  });

  test('400 for the company account, whose leads are not in its own ledger', async () => {
    const supabase = makeSupabase([
      {
        table: 'agents',
        result: { data: { ...AGENT, email: SUPER_ADMIN_EMAIL.toUpperCase() }, error: null },
      },
    ]);
    const createFirestore = makeFirestore({
      docs: { [`agents/${SUPER_ADMIN_EMAIL}`]: true },
    });
    const app = makeApp({ supabase, createFirestore });
    const res = await request(app).post('/lead-grants').send(webGrant());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/company account/);
    expect(createFirestore).not.toHaveBeenCalled();
    expect(supabase.callCount()).toBe(1);
  });
});

describe('POST /lead-grants crediting', () => {
  test('web credits verified, unverified and outstandingLeads and marks the grant credited', async () => {
    const supabase = makeSupabase(happyCalls());
    const path = `agents/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app)
      .post('/lead-grants')
      .send(webGrant({ verified: 2, unverified: 3 }));

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('credited');
    expect(createFirestore.refs[path].update).toHaveBeenCalledTimes(1);
    expect(createFirestore.refs[path].update).toHaveBeenCalledWith({
      verified: FieldValue.increment(2),
      unverified: FieldValue.increment(3),
      outstandingLeads: FieldValue.increment(5),
    });

    const [lookup, insert, credit] = supabase.queries;
    expect(lookup.table).toBe('agents');
    expect(lookup.eq).toHaveBeenCalledWith('id', AGENT_ID);
    expect(insert.table).toBe('lead_grants');
    expect(insert.insert).toHaveBeenCalledWith({
      id: GRANT_ID,
      agent_id: AGENT_ID,
      agent_email: EMAIL,
      brand: 'gsq',
      product: 'web',
      verified_count: 2,
      unverified_count: 3,
      quantity: 5,
      reason: 'bad_lead_make_good',
      note: 'received 2 verified leads over the age of 85',
      granted_by: ADMIN_ID,
      status: 'pending',
    });
    expect(credit.table).toBe('lead_grants');
    expect(credit.update).toHaveBeenCalledWith({
      status: 'credited',
      credited_at: expect.any(String),
    });
    expect(credit.eq).toHaveBeenCalledWith('id', GRANT_ID);
    expect(credit.eq).toHaveBeenCalledWith('status', 'pending');
  });

  test('web with only unverified leaves verified at +0', async () => {
    const supabase = makeSupabase(happyCalls());
    const path = `agents/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app)
      .post('/lead-grants')
      .send(webGrant({ verified: undefined, unverified: 4 }));

    expect(res.status).toBe(201);
    expect(createFirestore.refs[path].update).toHaveBeenCalledWith({
      verified: FieldValue.increment(0),
      unverified: FieldValue.increment(4),
      outstandingLeads: FieldValue.increment(4),
    });
  });

  test('instant_form credits outstandingInstantForms only', async () => {
    const supabase = makeSupabase(happyCalls());
    const path = `instant_forms/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send({
      requestId: GRANT_ID,
      agentId: AGENT_ID,
      product: 'instant_form',
      count: 3,
      reason: 'review_bounty',
      note: 'Google review',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('credited');
    expect(createFirestore.doc).not.toHaveBeenCalledWith(`agents/${EMAIL}`);
    expect(createFirestore.refs[path].update).toHaveBeenCalledWith({
      outstandingInstantForms: FieldValue.increment(3),
    });
    expect(supabase.queries[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        product: 'instant_form',
        verified_count: 0,
        unverified_count: 0,
        quantity: 3,
        reason: 'review_bounty',
      }),
    );
  });

  test('live_transfer credits outstandingLiveTransfers only', async () => {
    const supabase = makeSupabase(happyCalls());
    const path = `live_transfers/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send({
      requestId: GRANT_ID,
      agentId: AGENT_ID,
      product: 'live_transfer',
      count: 1,
      reason: 'comp',
      note: 'comp for a dropped transfer',
    });

    expect(res.status).toBe(201);
    expect(createFirestore.refs[path].update).toHaveBeenCalledWith({
      outstandingLiveTransfers: FieldValue.increment(1),
    });
    expect(supabase.queries[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({ product: 'live_transfer', quantity: 1 }),
    );
  });

  test('the requestId becomes the row id', async () => {
    const supabase = makeSupabase(happyCalls());
    const createFirestore = makeFirestore({ docs: { [`agents/${EMAIL}`]: true } });
    const app = makeApp({ supabase, createFirestore });
    const requestId = '7e2d3b45-2c3d-4e6f-9a01-23456789abcd';

    const res = await request(app)
      .post('/lead-grants')
      .send(webGrant({ requestId }));

    expect(res.status).toBe(201);
    expect(supabase.queries[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: requestId }),
    );
  });

  test('a repeated requestId is a 409 and credits nothing', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      {
        table: 'lead_grants',
        result: { data: null, error: { code: '23505', message: 'duplicate key' } },
      },
    ]);
    const path = `agents/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app)
      .post('/lead-grants')
      .send(webGrant());

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already submitted/);
    expect(res.body.duplicate).toBe(true);
    expect(createFirestore.refs[path].update).not.toHaveBeenCalled();
  });

  test('an insert failure credits nothing', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: null, error: { message: 'boom' } } },
    ]);
    const path = `agents/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send(webGrant());

    expect(res.status).toBe(500);
    expect(createFirestore.refs[path].update).not.toHaveBeenCalled();
  });

  test.each([
    ['NOT_FOUND', 5],
    ['PERMISSION_DENIED', 7],
    ['FAILED_PRECONDITION', 9],
  ])('a write GSQ refused (%s) marks the grant failed and returns 502', async (name, code) => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: null } },
    ]);
    const path = `agents/${EMAIL}`;
    const update = jest.fn().mockRejectedValue(grpcError(code, name));
    const createFirestore = makeFirestore({ docs: { [path]: true }, update });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send(webGrant());

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Nothing was credited/);
    expect(res.body.data).toEqual({ id: GRANT_ID, status: 'failed' });
    expect(update).toHaveBeenCalledTimes(1);
    const mark = supabase.queries[2];
    expect(mark.update).toHaveBeenCalledWith({ status: 'failed', error: name });
    expect(mark.eq).toHaveBeenCalledWith('id', GRANT_ID);
    expect(mark.eq).toHaveBeenCalledWith('status', 'pending');
    // never marked credited
    expect(supabase.callCount()).toBe(3);
    expect(
      supabase.queries.some((q) =>
        q.update.mock.calls.some(([fields]) => fields.status === 'credited'),
      ),
    ).toBe(false);
  });

  test.each([
    ['DEADLINE_EXCEEDED', 4],
    ['UNAVAILABLE', 14],
    ['CANCELLED', 1],
    ['INTERNAL', 13],
    ['no code (a reset connection)', undefined],
  ])('a write with an unknown outcome (%s) stays pending, never "nothing credited"', async (name, code) => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: null } },
    ]);
    const path = `agents/${EMAIL}`;
    const update = jest.fn().mockRejectedValue(grpcError(code, name));
    const createFirestore = makeFirestore({ docs: { [path]: true }, update });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send(webGrant());

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/may or may not/);
    expect(res.body.error).toMatch(/balance before giving/);
    expect(res.body.error).not.toMatch(/Nothing was credited/);
    expect(res.body.data).toEqual({ id: GRANT_ID, status: 'pending' });
    const mark = supabase.queries[2];
    expect(mark.update).toHaveBeenCalledWith({ error: `Outcome unknown: ${name}` });
    expect(mark.eq).toHaveBeenCalledWith('status', 'pending');
    expect(
      supabase.queries.some((q) =>
        q.update.mock.calls.some(([fields]) => fields.status),
      ),
    ).toBe(false);
  });

  test('still 502 when recording the Firestore failure also fails', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: { message: 'down' } } },
    ]);
    const path = `instant_forms/${EMAIL}`;
    const update = jest.fn().mockRejectedValue(grpcError(7, 'PERMISSION_DENIED'));
    const createFirestore = makeFirestore({ docs: { [path]: true }, update });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send({
      requestId: GRANT_ID,
      agentId: AGENT_ID,
      product: 'instant_form',
      count: 2,
      reason: 'other',
      note: 'test',
    });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Nothing was credited/);
    // the row could not be marked failed, so it still reads pending
    expect(res.body.data).toEqual({ id: GRANT_ID, status: 'pending' });
  });

  test('credited but the record update fails: 201 with a warning, never a retry', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: { message: 'down' } } },
    ]);
    const path = `agents/${EMAIL}`;
    const createFirestore = makeFirestore({ docs: { [path]: true } });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send(webGrant());

    expect(res.status).toBe(201);
    expect(res.body.warning).toMatch(/Do not give them again/);
    expect(res.body.data.status).toBe('credited');
    expect(createFirestore.refs[path].update).toHaveBeenCalledTimes(1);
  });
});

describe('GET /lead-grants', () => {
  test('lists newest first with the agent and granter joined', async () => {
    const rows = [
      { id: 'grant-2', created_at: '2026-11-21T10:00:00Z' },
      { id: GRANT_ID, created_at: '2026-11-20T10:00:00Z' },
    ];
    const supabase = makeSupabase([
      { table: 'lead_grants', result: { data: rows, error: null } },
    ]);
    const app = makeApp({ supabase });

    const res = await request(app).get('/lead-grants');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(rows);
    const [query] = supabase.queries;
    expect(query.table).toBe('lead_grants');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(100);
    const fields = query.select.mock.calls[0][0];
    expect(fields).toContain('agent:agents!lead_grants_agent_id_fkey(first_name,last_name,email)');
    expect(fields).toContain(
      'granted_by_agent:agents!lead_grants_granted_by_fkey(first_name,last_name,email)',
    );
    for (const column of ['product', 'verified_count', 'unverified_count', 'quantity', 'reason', 'note', 'status']) {
      expect(fields).toContain(column);
    }
  });

  test('caps the limit at 500', async () => {
    const supabase = makeSupabase([
      { table: 'lead_grants', result: { data: [], error: null } },
    ]);
    const app = makeApp({ supabase });
    const res = await request(app).get('/lead-grants?limit=9999');
    expect(res.status).toBe(200);
    expect(supabase.queries[0].limit).toHaveBeenCalledWith(500);
  });

  test('500 when the query fails', async () => {
    const supabase = makeSupabase([
      { table: 'lead_grants', result: { data: null, error: { message: 'down' } } },
    ]);
    const app = makeApp({ supabase });
    const res = await request(app).get('/lead-grants');
    expect(res.status).toBe(500);
  });
});
