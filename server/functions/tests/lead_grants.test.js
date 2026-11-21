/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');
const { FieldValue } = require('@google-cloud/firestore');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { createLeadGrantsRouter } = require('../endpoints/lead_grants');

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

// Fake GSQ Firestore: `docs` maps a path ('agents/<email>') to whether it
// exists; every doc ref is kept so a test can read the update it got.
const makeFirestore = ({ docs = {}, update } = {}) => {
  const refs = {};
  const doc = jest.fn((path) => {
    const ref = {
      get: jest.fn().mockResolvedValue({
        exists: Object.prototype.hasOwnProperty.call(docs, path),
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
  agent = { id: 'admin-1', email: 'admin@example.com' },
  role = 'admin',
  user = true,
}) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    if (user) req.user = { id: agent?.id, role };
    next();
  });
  app.use('/lead-grants', createLeadGrantsRouter({ supabase, createFirestore }));
  return app;
};

const AGENT = {
  id: 'agent-1',
  first_name: 'Shea',
  last_name: 'Morales',
  email: ' Shea@Example.com ',
};
const EMAIL = 'shea@example.com';

const webGrant = (overrides = {}) => ({
  agentId: 'agent-1',
  product: 'web',
  verified: 2,
  unverified: 0,
  reason: 'bad_lead_make_good',
  note: '  received 2 verified leads over the age of 85  ',
  ...overrides,
});

const pendingRow = (overrides = {}) => ({
  id: 'grant-1',
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
  test('POST without a signed-in user is forbidden', async () => {
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
    expect(lookup.eq).toHaveBeenCalledWith('id', 'agent-1');
    expect(insert.table).toBe('lead_grants');
    expect(insert.insert).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      agent_email: EMAIL,
      brand: 'gsq',
      product: 'web',
      verified_count: 2,
      unverified_count: 3,
      quantity: 5,
      reason: 'bad_lead_make_good',
      note: 'received 2 verified leads over the age of 85',
      granted_by: 'admin-1',
      status: 'pending',
    });
    expect(credit.table).toBe('lead_grants');
    expect(credit.update).toHaveBeenCalledWith({
      status: 'credited',
      credited_at: expect.any(String),
    });
    expect(credit.eq).toHaveBeenCalledWith('id', 'grant-1');
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
      agentId: 'agent-1',
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
      agentId: 'agent-1',
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

  test('a requestId becomes the row id', async () => {
    const supabase = makeSupabase(happyCalls());
    const createFirestore = makeFirestore({ docs: { [`agents/${EMAIL}`]: true } });
    const app = makeApp({ supabase, createFirestore });
    const requestId = '6f1c2a34-1b2c-4d5e-8f90-123456789abc';

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
      .send(webGrant({ requestId: '6f1c2a34-1b2c-4d5e-8f90-123456789abc' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already submitted/);
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

  test('a Firestore failure marks the grant failed with the error and returns 502', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: null } },
    ]);
    const path = `agents/${EMAIL}`;
    const update = jest.fn().mockRejectedValue(new Error('DEADLINE_EXCEEDED'));
    const createFirestore = makeFirestore({ docs: { [path]: true }, update });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send(webGrant());

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Nothing was credited/);
    expect(res.body.data).toEqual({ id: 'grant-1', status: 'failed' });
    expect(update).toHaveBeenCalledTimes(1);
    const mark = supabase.queries[2];
    expect(mark.update).toHaveBeenCalledWith({
      status: 'failed',
      error: 'DEADLINE_EXCEEDED',
    });
    expect(mark.eq).toHaveBeenCalledWith('id', 'grant-1');
    // never marked credited
    expect(supabase.callCount()).toBe(3);
    expect(
      supabase.queries.some((q) =>
        q.update.mock.calls.some(([fields]) => fields.status === 'credited'),
      ),
    ).toBe(false);
  });

  test('still 502 when marking the grant failed also fails', async () => {
    const supabase = makeSupabase([
      { table: 'agents', result: { data: AGENT, error: null } },
      { table: 'lead_grants', result: { data: pendingRow(), error: null } },
      { table: 'lead_grants', result: { data: null, error: { message: 'down' } } },
    ]);
    const path = `instant_forms/${EMAIL}`;
    const update = jest.fn().mockRejectedValue(new Error('UNAVAILABLE'));
    const createFirestore = makeFirestore({ docs: { [path]: true }, update });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/lead-grants').send({
      agentId: 'agent-1',
      product: 'instant_form',
      count: 2,
      reason: 'other',
      note: 'test',
    });

    expect(res.status).toBe(502);
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
      { id: 'grant-1', created_at: '2026-11-20T10:00:00Z' },
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
