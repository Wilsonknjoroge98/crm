/* global beforeEach, describe, expect, jest, test */

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const mockSupabaseFrom = jest.fn();
const mockSupabaseRpc = jest.fn();
jest.mock('../services/supabase', () => ({
  supabaseService: {
    from: (...args) => mockSupabaseFrom(...args),
    rpc: (...args) => mockSupabaseRpc(...args),
  },
}));

const axios = require('axios');
const express = require('express');
const request = require('supertest');
const {
  getSendblueCredentials,
  inboundSendblue,
  setFirestoreFactory,
} = require('../integrations/sendblue');
const messagesRouter = require('../endpoints/messages');

const LINE = '+15125550100';
const LEAD = '+15125550199';

const mockConfigDocs = (docs, { fail = false } = {}) => {
  const doc = jest.fn((id) => ({
    get: fail ?
      jest.fn().mockRejectedValue(new Error('firestore down')) :
      jest.fn().mockResolvedValue({
        exists: Boolean(docs[id]),
        data: () => docs[id],
      }),
  }));
  const collection = jest.fn(() => ({ doc }));
  setFirestoreFactory(() => ({ collection }));
  return { collection, doc };
};

// Chainable on every builder method, resolves `result` when awaited
const makeQuery = (result) => {
  const query = {};
  for (const method of ['select', 'eq', 'in', 'limit', 'upsert']) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
};

// tables: { [table]: result }, unlisted tables resolve to no rows
const mockTables = (tables = {}) => {
  const queries = {};
  mockSupabaseFrom.mockImplementation((table) => {
    const query = makeQuery(tables[table] ?? { data: [], error: null });
    queries[table] = queries[table] || [];
    queries[table].push(query);
    return query;
  });
  return queries;
};

const ownsLead = () =>
  mockTables({ leads: { data: [{ id: 'lead-1' }], error: null } });

const makeApp = (agent) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.agent = agent;
    next();
  });
  app.use('/messages', messagesRouter);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SEND_BLUE_API_KEY = 'shared-key';
  process.env.SEND_BLUE_SECRET_KEY = 'shared-secret';
});

describe('getSendblueCredentials', () => {
  test('returns per-account credentials from sendblue_config', async () => {
    const { collection, doc } = mockConfigDocs({
      'agent@example.com': {
        apiKey: 'sub-key',
        apiSecret: 'sub-secret',
        sendblueNumber: LINE,
      },
    });

    const credentials = await getSendblueCredentials(' Agent@Example.com ');

    expect(collection).toHaveBeenCalledWith('sendblue_config');
    expect(doc).toHaveBeenCalledWith('agent@example.com');
    expect(credentials).toEqual({
      apiKey: 'sub-key',
      apiSecret: 'sub-secret',
      sendblueNumber: LINE,
      source: 'sendblue_config',
    });
  });

  test('falls back to the shared account when there is no config doc', async () => {
    mockConfigDocs({});
    const credentials = await getSendblueCredentials('legacy@example.com');
    expect(credentials).toMatchObject({
      apiKey: 'shared-key',
      apiSecret: 'shared-secret',
      source: 'shared_account',
    });
  });

  test('falls back while provisioning has not saved credentials yet', async () => {
    mockConfigDocs({ 'new@example.com': { status: 'provisioning' } });
    const credentials = await getSendblueCredentials('new@example.com');
    expect(credentials.source).toBe('shared_account');
  });

  test('throws 503 instead of using the shared account when Firestore fails', async () => {
    mockConfigDocs({}, { fail: true });
    await expect(getSendblueCredentials('agent@example.com')).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe('messages endpoints', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };

  beforeEach(() => {
    ownsLead();
  });

  test('GET reads the thread with the agent subaccount credentials', async () => {
    mockConfigDocs({
      'agent@example.com': { apiKey: 'sub-key', apiSecret: 'sub-secret', sendblueNumber: LINE },
    });
    axios.get.mockResolvedValue({
      data: {
        data: [
          { message_handle: 'b', content: 'hi back', is_outbound: true, sendblue_number: LINE },
          { message_handle: 'x', content: 'other line', sendblue_number: '+15125550111' },
          { message_handle: 'a', content: 'hi', is_outbound: false, sendblue_number: LINE },
        ],
      },
    });

    const res = await request(makeApp(agent)).get('/messages').query({ phone: '5125550199' });

    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.id)).toEqual(['a', 'b']);
    const [, options] = axios.get.mock.calls[0];
    expect(options.headers).toEqual({
      'sb-api-key-id': 'sub-key',
      'sb-api-secret-key': 'sub-secret',
    });
    expect(options.params).toMatchObject({ number: LEAD, sendblue_number: LINE });
  });

  test('POST sends with the agent subaccount credentials', async () => {
    mockConfigDocs({
      'agent@example.com': { apiKey: 'sub-key', apiSecret: 'sub-secret', sendblueNumber: LINE },
    });
    axios.post.mockResolvedValue({
      data: { message_handle: 'm1', content: 'hello', is_outbound: true, status: 'QUEUED' },
    });

    const res = await request(makeApp(agent))
      .post('/messages')
      .send({ phone: '(512) 555-0199', content: 'hello' });

    expect(res.status).toBe(201);
    const [, body, options] = axios.post.mock.calls[0];
    expect(body).toEqual({ from_number: LINE, number: LEAD, content: 'hello' });
    expect(options.headers['sb-api-key-id']).toBe('sub-key');
    expect(options.headers['sb-api-secret-key']).toBe('sub-secret');
  });

  test('legacy agent without sendblue_config keeps using the shared account', async () => {
    mockConfigDocs({});
    axios.post.mockResolvedValue({ data: { message_handle: 'm2', content: 'yo' } });

    const res = await request(makeApp({ ...agent, email: 'legacy@example.com' }))
      .post('/messages')
      .send({ phone: LEAD, content: 'yo' });

    expect(res.status).toBe(201);
    const [, , options] = axios.post.mock.calls[0];
    expect(options.headers['sb-api-key-id']).toBe('shared-key');
  });

  test('credential lookup failure returns 503 and never calls Sendblue', async () => {
    mockConfigDocs({}, { fail: true });

    const res = await request(makeApp(agent)).get('/messages').query({ phone: LEAD });

    expect(res.status).toBe(503);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('agent without a line still gets 409 before any credential lookup', async () => {
    const { collection } = mockConfigDocs({});

    const res = await request(makeApp({ ...agent, sendblue_number: null }))
      .get('/messages')
      .query({ phone: LEAD });

    expect(res.status).toBe(409);
    expect(collection).not.toHaveBeenCalled();
  });
});

describe('ownership', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };

  test('GET 403s for a number that is not one of the agent leads or clients', async () => {
    mockConfigDocs({});
    mockTables({});

    const res = await request(makeApp(agent)).get('/messages').query({ phone: LEAD });

    expect(res.status).toBe(403);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('a client of the agent counts as owned', async () => {
    mockConfigDocs({});
    mockTables({ clients: { data: [{ id: 'client-1' }], error: null } });
    axios.get.mockResolvedValue({ data: { data: [] } });

    const res = await request(makeApp(agent)).get('/messages').query({ phone: LEAD });

    expect(res.status).toBe(200);
  });
});

describe('POST /messages marks the thread read', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };

  test('upserts message_reads after a successful send', async () => {
    mockConfigDocs({});
    const queries = ownsLead();
    axios.post.mockResolvedValue({ data: { message_handle: 'm1', content: 'hi' } });

    const res = await request(makeApp(agent))
      .post('/messages')
      .send({ phone: LEAD, content: 'hi' });

    expect(res.status).toBe(201);
    const [row, options] = queries.message_reads[0].upsert.mock.calls[0];
    expect(row).toMatchObject({ agent_id: 'agent-1', number: LEAD });
    expect(options).toEqual({ onConflict: 'agent_id,number' });
  });

  test('a failed read upsert still returns the sent message', async () => {
    mockConfigDocs({});
    mockTables({
      leads: { data: [{ id: 'lead-1' }], error: null },
      message_reads: { data: null, error: { message: 'db down' } },
    });
    axios.post.mockResolvedValue({ data: { message_handle: 'm1', content: 'hi' } });

    const res = await request(makeApp(agent))
      .post('/messages')
      .send({ phone: LEAD, content: 'hi' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('m1');
  });
});

describe('GET /messages/inbox', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };
  const row = (overrides = {}) => ({
    number: LEAD,
    last_content: 'hey',
    last_outbound: false,
    last_status: 'RECEIVED',
    last_at: '2026-10-22T15:00:00+00:00',
    unread_count: 2,
    lead_id: 'lead-1',
    client_id: null,
    first_name: 'Ann',
    last_name: 'Lee',
    unread_total: 5,
    ...overrides,
  });

  test('maps rows to threads and returns the unread total', async () => {
    mockSupabaseRpc.mockResolvedValue({ data: [row()], error: null });

    const res = await request(makeApp(agent)).get('/messages/inbox');

    expect(res.status).toBe(200);
    expect(mockSupabaseRpc).toHaveBeenCalledWith('message_inbox', {
      p_agent_id: 'agent-1',
      p_line: LINE,
      p_limit: 50,
      p_before: null,
    });
    expect(res.body).toEqual({
      threads: [
        {
          phone: LEAD,
          leadId: 'lead-1',
          clientId: null,
          firstName: 'Ann',
          lastName: 'Lee',
          unreadCount: 2,
          lastMessage: {
            content: 'hey',
            outbound: false,
            status: 'RECEIVED',
            sentAt: '2026-10-22T15:00:00+00:00',
          },
        },
      ],
      unreadTotal: 5,
      nextBefore: null,
    });
  });

  test('a full page returns a cursor, before passes through and limit is clamped', async () => {
    mockSupabaseRpc.mockResolvedValue({
      data: [
        row({ last_at: '2026-10-22T15:00:00+00:00' }),
        row({ last_at: '2026-10-21T15:00:00+00:00' }),
      ],
      error: null,
    });

    const res = await request(makeApp(agent))
      .get('/messages/inbox')
      .query({ limit: 2, before: '2026-10-23T00:00:00Z' });

    expect(res.body.nextBefore).toBe('2026-10-21T15:00:00+00:00');
    expect(mockSupabaseRpc.mock.calls[0][1]).toMatchObject({
      p_limit: 2,
      p_before: '2026-10-23T00:00:00.000Z',
    });

    await request(makeApp(agent)).get('/messages/inbox').query({ limit: 5000 });
    expect(mockSupabaseRpc.mock.calls[1][1].p_limit).toBe(100);
  });

  test('empty inbox has zero unread', async () => {
    mockSupabaseRpc.mockResolvedValue({ data: [], error: null });

    const res = await request(makeApp(agent)).get('/messages/inbox');

    expect(res.body).toEqual({ threads: [], unreadTotal: 0, nextBefore: null });
  });

  test('bad before is a 400, rpc error is a 500, no line is a 409', async () => {
    let res = await request(makeApp(agent))
      .get('/messages/inbox')
      .query({ before: 'nope' });
    expect(res.status).toBe(400);

    mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    res = await request(makeApp(agent)).get('/messages/inbox');
    expect(res.status).toBe(500);

    res = await request(makeApp({ ...agent, sendblue_number: null })).get(
      '/messages/inbox',
    );
    expect(res.status).toBe(409);
  });
});

describe('POST /messages/read', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };

  test('upserts the read marker for an owned number', async () => {
    const queries = ownsLead();

    const res = await request(makeApp(agent))
      .post('/messages/read')
      .send({ phone: '5125550199' });

    expect(res.status).toBe(204);
    expect(queries.message_reads[0].upsert.mock.calls[0][0]).toMatchObject({
      agent_id: 'agent-1',
      number: LEAD,
    });
  });

  test('403s for a number the agent does not own', async () => {
    const queries = mockTables({});

    const res = await request(makeApp(agent))
      .post('/messages/read')
      .send({ phone: LEAD });

    expect(res.status).toBe(403);
    expect(queries.message_reads).toBeUndefined();
  });

  test('upsert error is a 500', async () => {
    mockTables({
      leads: { data: [{ id: 'lead-1' }], error: null },
      message_reads: { data: null, error: { message: 'db down' } },
    });

    const res = await request(makeApp(agent))
      .post('/messages/read')
      .send({ phone: LEAD });

    expect(res.status).toBe(500);
  });
});

describe('inboundSendblue webhook', () => {
  const makeResponse = () => {
    const res = { status: jest.fn(() => res), send: jest.fn(() => res) };
    return res;
  };

  beforeEach(() => {
    process.env.SEND_BLUE_WEBHOOK_SECRET = 'whsec';
  });

  test('rejects a bad signing secret', async () => {
    const res = makeResponse();

    await inboundSendblue({ headers: { 'sb-signing-secret': 'wrong' }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('stores an inbound message keyed on message_handle', async () => {
    const queries = mockTables({});
    const res = makeResponse();

    await inboundSendblue(
      {
        headers: { 'sb-signing-secret': 'whsec' },
        body: {
          message_handle: 'h1',
          content: 'hello',
          is_outbound: false,
          from_number: LEAD,
          to_number: LINE,
          sendblue_number: LINE,
          status: 'RECEIVED',
          date_sent: '2026-10-22T15:00:00Z',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const [row, options] = queries.messages[0].upsert.mock.calls[0];
    expect(row).toMatchObject({
      message_handle: 'h1',
      sendblue_number: LINE,
      number: LEAD,
      is_outbound: false,
    });
    expect(options).toEqual({ onConflict: 'message_handle' });
  });

  test('outbound status event takes the line from from_number', async () => {
    const queries = mockTables({});
    const res = makeResponse();

    await inboundSendblue(
      {
        headers: { 'sb-signing-secret': 'whsec' },
        body: {
          message_handle: 'h2',
          is_outbound: true,
          from_number: LINE,
          to_number: LEAD,
          sendblue_number: null,
          status: 'DELIVERED',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(queries.messages[0].upsert.mock.calls[0][0]).toMatchObject({
      sendblue_number: LINE,
      number: LEAD,
      is_outbound: true,
    });
  });
});
