/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const {
  createRefundsRouter,
  GSQ_LEAD_VENDOR_ID,
} = require('../endpoints/refunds');
const { SUPERUSER_ID } = require('../endpoints/business_access');
const {
  GSQ_PLATFORM_EMAIL,
  SUPER_ADMIN_EMAIL,
} = require('../integrations/GSQ');

// Each entry is one `supabase.from(table)` call, in the order the route
// under test is expected to make them. Every query is both awaitable
// directly (routes that end the chain on select/order) and exposes
// maybeSingle() (routes that narrow to one row) — both resolve `result`.
const makeSupabase = (calls) => {
  let index = 0;
  const seen = [];
  const from = jest.fn((table) => {
    const call = calls[index];
    index += 1;
    seen.push({ table, expected: call?.table });
    const result = call ? call.result : { data: null, error: null };
    const query = {
      select: jest.fn(() => query),
      update: jest.fn(() => query),
      eq: jest.fn(() => query),
      or: jest.fn(() => query),
      is: jest.fn(() => query),
      not: jest.fn(() => query),
      order: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue(result),
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  });
  return { from, seen: () => seen, callCount: () => index };
};

// Fake Firestore: doc('leads/<id>') and doc('agents/<email>') resolve from
// the maps passed in; agentUpdate lets a test force the credit write to fail.
const makeFirestore = ({ leadsDocs = {}, agentsDocs = {}, agentUpdate } = {}) => {
  const doc = jest.fn((path) => {
    if (path.startsWith('leads/')) {
      const id = path.slice('leads/'.length);
      return {
        get: jest.fn().mockResolvedValue({ data: () => leadsDocs[id] }),
      };
    }
    if (path.startsWith('agents/')) {
      const email = path.slice('agents/'.length);
      return {
        get: jest.fn().mockResolvedValue({
          exists: Object.prototype.hasOwnProperty.call(agentsDocs, email),
        }),
        update:
          agentUpdate ||
          jest.fn().mockResolvedValue(undefined),
      };
    }
    throw new Error(`Unexpected doc path: ${path}`);
  });
  return jest.fn(() => ({ doc }));
};

const makeApp = ({
  supabase,
  createFirestore = makeFirestore(),
  getRealContact = jest.fn().mockResolvedValue({
    contact_grade: 'A',
    activity_score: 90,
    name_match: true,
  }),
  agent = { id: 'agent-1', email: 'agent-1@example.com' },
  role = 'agent',
}) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    req.user = { id: agent?.id, role };
    next();
  });
  app.use(
    '/refunds',
    createRefundsRouter({ supabase, createFirestore, getRealContact }),
  );
  return app;
};

describe('POST /refunds', () => {
  test('rejects a verified lead', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            phone: '2025550100',
            verified: true,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({ supabase: supabase });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unverified/i);
  });

  test('rejects a non-GSQ lead', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: null,
            lead_vendor_id: 'some-other-vendor-id',
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({ supabase });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gsq/i);
    // no claim/update was ever attempted — only the initial fetch
    expect(supabase.callCount()).toBe(1);
  });

  test('rejects a sold lead even if unverified', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: true,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({ supabase });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsold/i);
  });

  test('rejects when a refund is already requested', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: false,
            refund_status: 'requested',
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({ supabase });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(409);
  });

  test('rejects when the requesting agent does not match the gsq issuedTo email', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const createFirestore = makeFirestore({
      leadsDocs: { 'gsq-1': { issuedTo: 'someone-else@example.com' } },
    });
    const app = makeApp({ supabase, createFirestore });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/first issued to/i);
  });

  test('normalizes the gsq platform email before comparing issuedTo', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            phone: '2025550100',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
      { table: 'leads', result: { data: { id: 'lead-1' }, error: null } },
      { table: 'leads', result: { data: { id: 'lead-1' }, error: null } },
    ]);
    const createFirestore = makeFirestore({
      leadsDocs: { 'gsq-1': { issuedTo: GSQ_PLATFORM_EMAIL } },
    });
    const app = makeApp({
      supabase,
      createFirestore,
      agent: { id: 'agent-1', email: SUPER_ADMIN_EMAIL },
    });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(201);
  });

  test('requests a refund for the agent\'s own lead and grades it via trestle', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            phone: '2025550100',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
      {
        table: 'leads',
        result: {
          data: { id: 'lead-1', refund_status: 'requested' },
          error: null,
        },
      },
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            refund_status: 'requested',
            contact_grade: 'A',
            activity_score: 90,
            name_match: true,
          },
          error: null,
        },
      },
    ]);
    const createFirestore = makeFirestore({
      leadsDocs: { 'gsq-1': { issuedTo: 'agent-1@example.com' } },
    });
    const getRealContact = jest.fn().mockResolvedValue({
      contact_grade: 'A',
      activity_score: 90,
      name_match: true,
    });
    const app = makeApp({ supabase, createFirestore, getRealContact });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(201);
    expect(res.body.data.refund_status).toBe('requested');
    expect(getRealContact).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      phone: '2025550100',
      email: 'ada@example.com',
    });
    // the claim (2nd call) must credit the requester, not overwrite it later
    const claimUpdate = supabase.from.mock.results[1].value.update.mock.calls[0][0];
    expect(claimUpdate.refund_requested_by).toBe('agent-1');
    expect(claimUpdate.refund_status).toBe('requested');
  });

  test('is permanently blocked by a prior denial — no double jeopardy', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: false,
            refund_status: 'denied',
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({ supabase });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already denied/i);
    // no claim/update was ever attempted — only the initial fetch
    expect(supabase.callCount()).toBe(1);
  });

  test('credits the owning agent, not the superuser, when an admin files on behalf of the agent', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            phone: '2025550100',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
      {
        table: 'leads',
        result: {
          data: { id: 'lead-1', refund_status: 'requested' },
          error: null,
        },
      },
      { table: 'leads', result: { data: { id: 'lead-1' }, error: null } },
    ]);
    const app = makeApp({
      supabase,
      agent: { id: SUPERUSER_ID, email: SUPER_ADMIN_EMAIL },
    });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(201);
    const claimUpdate = supabase.from.mock.results[1].value.update.mock.calls[0][0];
    expect(claimUpdate.refund_requested_by).toBe('agent-1');
  });

  test('refuses an admin filing on a lead with no owning agent', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: null,
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
    ]);
    const app = makeApp({
      supabase,
      agent: { id: SUPERUSER_ID, email: SUPER_ADMIN_EMAIL },
    });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no owning agent/i);
  });

  test('does not bill trestle twice and still succeeds with nulls when it fails', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            phone: '2025550100',
            verified: false,
            sold: false,
            refund_status: null,
            agent_id: 'agent-1',
            gsq_id: 'gsq-1',
            lead_vendor_id: GSQ_LEAD_VENDOR_ID,
          },
          error: null,
        },
      },
      {
        table: 'leads',
        result: {
          data: { id: 'lead-1', refund_status: 'requested' },
          error: null,
        },
      },
      {
        table: 'leads',
        result: {
          data: {
            id: 'lead-1',
            refund_status: 'requested',
            contact_grade: null,
            activity_score: null,
            name_match: null,
          },
          error: null,
        },
      },
    ]);
    const createFirestore = makeFirestore({
      leadsDocs: { 'gsq-1': { issuedTo: 'agent-1@example.com' } },
    });
    const getRealContact = jest.fn().mockRejectedValue(new Error('timeout'));
    const app = makeApp({ supabase, createFirestore, getRealContact });

    const res = await request(app).post('/refunds').send({ leadId: 'lead-1' });

    expect(res.status).toBe(201);
    expect(getRealContact).toHaveBeenCalledTimes(1);
    expect(res.body.data.contact_grade).toBeNull();
  });
});

describe('GET /refunds', () => {
  test('is admin-only', async () => {
    const supabase = makeSupabase([]);
    const app = makeApp({ supabase, role: 'agent' });

    const res = await request(app).get('/refunds');

    expect(res.status).toBe(403);
  });

  test('lists pending requests ordered by request age', async () => {
    const rows = [{ id: 'lead-1' }, { id: 'lead-2' }];
    const supabase = makeSupabase([
      { table: 'leads', result: { data: rows, error: null } },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).get('/refunds');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(rows);
    const query = supabase.from.mock.results[0].value;
    expect(query.order).toHaveBeenCalledWith('refund_requested_at', {
      ascending: true,
      nullsFirst: true,
    });
  });

  test('filters to a resolved status, newest first', async () => {
    const rows = [{ id: 'lead-1', refund_status: 'denied' }];
    const supabase = makeSupabase([
      { table: 'leads', result: { data: rows, error: null } },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).get('/refunds?status=denied');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(rows);
    const query = supabase.from.mock.results[0].value;
    expect(query.eq).toHaveBeenCalledWith('refund_status', 'denied');
    expect(query.order).toHaveBeenCalledWith('refund_requested_at', {
      ascending: false,
    });
  });

  test('status=all returns every resolved and pending request', async () => {
    const supabase = makeSupabase([
      { table: 'leads', result: { data: [], error: null } },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).get('/refunds?status=all');

    expect(res.status).toBe(200);
    const query = supabase.from.mock.results[0].value;
    expect(query.not).toHaveBeenCalledWith('refund_status', 'is', null);
  });

  test('rejects an unrecognized status filter', async () => {
    const supabase = makeSupabase([]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).get('/refunds?status=bogus');

    expect(res.status).toBe(400);
    expect(supabase.callCount()).toBe(0);
  });
});

describe('POST /refunds/:leadId/approve', () => {
  test('credits the agent in gsq and flips the lead to approved', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            refund_status: 'requested',
            requested_by: { email: 'Agent-1@Example.com' },
          },
          error: null,
        },
      },
      {
        table: 'leads',
        result: { data: { id: 'lead-1' }, error: null },
      },
    ]);
    const createFirestore = makeFirestore({
      agentsDocs: { 'agent-1@example.com': {} },
    });
    const app = makeApp({ supabase, createFirestore, role: 'admin' });

    const res = await request(app).post('/refunds/lead-1/approve');

    expect(res.status).toBe(200);
    expect(res.body.data.refund_status).toBe('approved');
  });

  test('rejects a lead that is not pending', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: { data: { refund_status: 'approved' }, error: null },
      },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).post('/refunds/lead-1/approve');

    expect(res.status).toBe(409);
  });

  test('reverts the lead to requested when the gsq credit fails', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: {
          data: {
            refund_status: 'requested',
            requested_by: { email: 'agent-1@example.com' },
          },
          error: null,
        },
      },
      {
        table: 'leads',
        result: { data: { id: 'lead-1' }, error: null },
      },
      {
        table: 'leads',
        result: { data: { id: 'lead-1' }, error: null },
      },
    ]);
    const agentUpdate = jest.fn().mockRejectedValue(new Error('firestore down'));
    const createFirestore = makeFirestore({
      agentsDocs: { 'agent-1@example.com': {} },
      agentUpdate,
    });
    const app = makeApp({ supabase, createFirestore, role: 'admin' });

    const res = await request(app).post('/refunds/lead-1/approve');

    expect(res.status).toBe(500);
    const revertUpdate = supabase.from.mock.results[2].value.update.mock.calls[0][0];
    expect(revertUpdate.refund_status).toBe('requested');
    expect(revertUpdate.refund_reviewed_by).toBeNull();
  });
});

describe('POST /refunds/:leadId/deny', () => {
  test('records the reviewer and an optional reason', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: { data: { refund_status: 'requested' }, error: null },
      },
      {
        table: 'leads',
        result: { data: { id: 'lead-1' }, error: null },
      },
    ]);
    const app = makeApp({
      supabase,
      role: 'admin',
      agent: { id: 'admin-1' },
    });

    const res = await request(app)
      .post('/refunds/lead-1/deny')
      .send({ reason: 'Lead looks legitimate' });

    expect(res.status).toBe(200);
    const denyUpdate = supabase.from.mock.results[1].value.update.mock.calls[0][0];
    expect(denyUpdate.refund_denial_reason).toBe('Lead looks legitimate');
    expect(denyUpdate.refund_reviewed_by).toBe('admin-1');
  });

  test('404s for a lead that does not exist', async () => {
    const supabase = makeSupabase([
      { table: 'leads', result: { data: null, error: null } },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).post('/refunds/missing/deny');

    expect(res.status).toBe(404);
  });

  test('409s for a lead whose refund is not pending', async () => {
    const supabase = makeSupabase([
      {
        table: 'leads',
        result: { data: { refund_status: 'approved' }, error: null },
      },
    ]);
    const app = makeApp({ supabase, role: 'admin' });

    const res = await request(app).post('/refunds/lead-1/deny');

    expect(res.status).toBe(409);
  });
});
