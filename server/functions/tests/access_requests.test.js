/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const {
  createAccessRequestsRouter,
  createPublicAccessRequestRouter,
} = require('../endpoints/access_requests');

// Each entry is one `supabase.from(table)` call, in the order the route
// under test is expected to make them. Every query is awaitable directly and
// exposes maybeSingle(); both resolve `result`. `calls()` returns what each
// query was asked to do, so a test can check the row that was written.
const makeSupabase = (script) => {
  let index = 0;
  const made = [];
  const from = jest.fn((table) => {
    const step = script[index];
    index += 1;
    const result = step ? step.result : { data: null, error: null };
    const record = { table, expected: step?.table };
    made.push(record);
    const query = {
      select: jest.fn(() => query),
      insert: jest.fn((row) => {
        record.insert = row;
        return query;
      }),
      update: jest.fn((row) => {
        record.update = row;
        return query;
      }),
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue(result),
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  });
  return { from, calls: () => made };
};

const VALID = {
  first_name: ' Ada ',
  last_name: 'Lovelace',
  email: 'Ada@Example.com',
  phone: '(614) 555-0142',
  npn: '12345678',
  states: ['oh', 'TX', 'OH'],
};

const makePublicApp = ({
  supabase,
  notify = jest.fn(),
  recentCount = jest.fn().mockResolvedValue(0),
}) => {
  const app = express();
  app.use(express.json());
  app.use(createPublicAccessRequestRouter({ supabase, notify, recentCount }));
  return app;
};

const makeAdminApp = ({
  supabase,
  sendInvite = jest.fn(),
  agent = { id: 'admin-1' },
  role = 'admin',
}) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    req.user = { id: agent?.id, role };
    next();
  });
  app.use(
    '/access-requests',
    createAccessRequestsRouter({ supabase, sendInvite }),
  );
  return app;
};

describe('POST /access-request', () => {
  test('stores a cleaned request and announces it', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { error: null } },
    ]);
    const notify = jest.fn();
    const res = await request(makePublicApp({ supabase, notify }))
      .post('/access-request')
      .send(VALID);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: true });
    const stored = supabase.calls()[0].insert;
    expect(stored).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      phone: '6145550142',
      npn: '12345678',
      states: ['OH', 'TX'],
    });
    expect(notify).toHaveBeenCalledWith(stored, 'https://fexdigital.com');
  });

  test.each([
    ['a missing name', { first_name: '' }, /name/i],
    ['a bad email', { email: 'not-an-email' }, /email/i],
    ['a short phone', { phone: '555-0142' }, /phone/i],
    ['a missing NPN', { npn: 'abc' }, /producer number/i],
    ['a short NPN', { npn: '123456' }, /producer number/i],
    ['a long NPN', { npn: '12345678901' }, /producer number/i],
    ['no states', { states: [] }, /states/i],
    ['an unknown state', { states: ['OH', 'ZZ'] }, /states/i],
  ])('rejects %s without touching the database', async (_, patch, message) => {
    const supabase = makeSupabase([]);
    const res = await request(makePublicApp({ supabase }))
      .post('/access-request')
      .send({ ...VALID, ...patch });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('answers a repeat of a waiting request the same as a new one', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { error: { code: '23505' } } },
    ]);
    const notify = jest.fn();
    const res = await request(makePublicApp({ supabase, notify }))
      .post('/access-request')
      .send(VALID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(notify).not.toHaveBeenCalled();
  });

  test('drops a submission that filled in the hidden field', async () => {
    const supabase = makeSupabase([]);
    const res = await request(makePublicApp({ supabase }))
      .post('/access-request')
      .send({ ...VALID, company: 'Acme SEO' });

    expect(res.status).toBe(200);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('still succeeds when the announcement fails', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { error: null } },
    ]);
    const notify = jest.fn().mockRejectedValue(new Error('slack down'));
    const res = await request(makePublicApp({ supabase, notify }))
      .post('/access-request')
      .send(VALID);

    expect(res.status).toBe(201);
  });
});

describe('POST /access-request limits', () => {
  test('turns one address away after five tries in ten minutes', async () => {
    const supabase = makeSupabase([]);
    const app = makePublicApp({ supabase });
    const send = () =>
      request(app)
        .post('/access-request')
        .set('X-Forwarded-For', '1.1.1.1')
        .send({ ...VALID, email: 'bad' });

    for (let i = 0; i < 5; i += 1) expect((await send()).status).toBe(400);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  test('stores nothing once the hourly cap is reached', async () => {
    const supabase = makeSupabase([]);
    const notify = jest.fn();
    const recentCount = jest.fn().mockResolvedValue(30);
    const res = await request(makePublicApp({ supabase, notify, recentCount }))
      .post('/access-request')
      .send(VALID);

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/try again/i);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test('still takes the request when the count cannot be read', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { error: null } },
    ]);
    const recentCount = jest.fn().mockRejectedValue(new Error('db down'));
    const res = await request(makePublicApp({ supabase, recentCount }))
      .post('/access-request')
      .send(VALID);

    expect(res.status).toBe(201);
  });
});

describe('GET /access-requests', () => {
  test('is admin only', async () => {
    const supabase = makeSupabase([]);
    const res = await request(makeAdminApp({ supabase, role: 'agent' })).get(
      '/access-requests',
    );

    expect(res.status).toBe(403);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns the queue', async () => {
    const rows = [{ id: 'req-1', status: 'requested' }];
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: rows, error: null } },
    ]);
    const res = await request(makeAdminApp({ supabase })).get(
      '/access-requests',
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(rows);
  });

  test('rejects an unknown status filter', async () => {
    const supabase = makeSupabase([]);
    const res = await request(makeAdminApp({ supabase })).get(
      '/access-requests?status=maybe',
    );

    expect(res.status).toBe(400);
  });
});

describe('POST /access-requests/:id/approve', () => {
  const pending = { id: 'req-1', email: 'ada@example.com', status: 'requested' };

  test('mints an invite with the reviewer as upline', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: pending, error: null } },
      { table: 'agents', result: { data: null, error: null } },
      {
        table: 'access_requests',
        result: { data: { ...pending, status: 'approved' }, error: null },
      },
      { table: 'invites', result: { error: null } },
    ]);
    const sendInvite = jest.fn();
    const res = await request(makeAdminApp({ supabase, sendInvite }))
      .post('/access-requests/req-1/approve')
      .set('Origin', 'https://www.fexdigital.com');

    expect(res.status).toBe(200);
    const [, , claim, invite] = supabase.calls();
    expect(sendInvite).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com' }),
      `https://www.fexdigital.com/signup?token=${claim.update.invite_token}`,
    );
    expect(res.body.data.invite_emailed).toBe(true);
    expect(claim.update).toMatchObject({
      status: 'approved',
      reviewed_by: 'admin-1',
    });
    expect(invite.table).toBe('invites');
    expect(invite.insert).toMatchObject({
      token: claim.update.invite_token,
      upline_agent_id: 'admin-1',
      used: false,
    });
    expect(res.body.data.status).toBe('approved');
  });

  test('stays approved when the invite email fails', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: pending, error: null } },
      { table: 'agents', result: { data: null, error: null } },
      {
        table: 'access_requests',
        result: { data: { ...pending, status: 'approved' }, error: null },
      },
      { table: 'invites', result: { error: null } },
    ]);
    const sendInvite = jest.fn().mockRejectedValue(new Error('refused'));
    const res = await request(makeAdminApp({ supabase, sendInvite }))
      .post('/access-requests/req-1/approve')
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(200);
    expect(res.body.data.invite_emailed).toBe(false);
    // a link is never built from a site that isn't ours
    expect(sendInvite.mock.calls[0][1]).toMatch(
      /^https:\/\/fexdigital\.com\/signup\?token=/,
    );
    expect(supabase.calls()).toHaveLength(4);
  });

  test('refuses a request that was already reviewed', async () => {
    const supabase = makeSupabase([
      {
        table: 'access_requests',
        result: { data: { ...pending, status: 'denied' }, error: null },
      },
    ]);
    const res = await request(makeAdminApp({ supabase })).post(
      '/access-requests/req-1/approve',
    );

    expect(res.status).toBe(409);
    expect(supabase.calls()).toHaveLength(1);
  });

  test('refuses an email that already has an account', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: pending, error: null } },
      { table: 'agents', result: { data: { id: 'agent-9' }, error: null } },
    ]);
    const res = await request(makeAdminApp({ supabase })).post(
      '/access-requests/req-1/approve',
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already has an account/);
    expect(supabase.calls()).toHaveLength(2);
  });

  test('loses a double click instead of minting a second invite', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: pending, error: null } },
      { table: 'agents', result: { data: null, error: null } },
      // the guarded update matched no row: someone else got there first
      { table: 'access_requests', result: { data: null, error: null } },
    ]);
    const res = await request(makeAdminApp({ supabase })).post(
      '/access-requests/req-1/approve',
    );

    expect(res.status).toBe(409);
    expect(supabase.calls().some((c) => c.table === 'invites')).toBe(false);
  });

  test('puts the request back in the queue when the invite fails', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: pending, error: null } },
      { table: 'agents', result: { data: null, error: null } },
      {
        table: 'access_requests',
        result: { data: { ...pending, status: 'approved' }, error: null },
      },
      { table: 'invites', result: { error: { message: 'insert failed' } } },
      { table: 'access_requests', result: { error: null } },
    ]);
    const res = await request(makeAdminApp({ supabase })).post(
      '/access-requests/req-1/approve',
    );

    expect(res.status).toBe(500);
    expect(supabase.calls()[4].update).toMatchObject({
      status: 'requested',
      invite_token: null,
    });
  });

  test('is admin only', async () => {
    const supabase = makeSupabase([]);
    const res = await request(makeAdminApp({ supabase, role: 'agent' })).post(
      '/access-requests/req-1/approve',
    );

    expect(res.status).toBe(403);
  });
});

describe('POST /access-requests/:id/deny', () => {
  test('records the reason and reviewer', async () => {
    const supabase = makeSupabase([
      {
        table: 'access_requests',
        result: { data: { id: 'req-1', status: 'denied' }, error: null },
      },
    ]);
    const res = await request(makeAdminApp({ supabase }))
      .post('/access-requests/req-1/deny')
      .send({ reason: ' No active license ' });

    expect(res.status).toBe(200);
    expect(supabase.calls()[0].update).toMatchObject({
      status: 'denied',
      denial_reason: 'No active license',
      reviewed_by: 'admin-1',
    });
  });

  test('refuses a request that was already reviewed', async () => {
    const supabase = makeSupabase([
      { table: 'access_requests', result: { data: null, error: null } },
    ]);
    const res = await request(makeAdminApp({ supabase })).post(
      '/access-requests/req-1/deny',
    );

    expect(res.status).toBe(409);
  });
});
