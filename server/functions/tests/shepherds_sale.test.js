/* global jest, describe, test, expect, beforeEach */

const express = require('express');
const request = require('supertest');

const mockCreateClientSale = jest.fn();
const mockSupabaseFrom = jest.fn();
// collection name -> array of { id, data }
let mockGsqDocs = {};

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  Firestore: jest.fn().mockImplementation(() => ({
    collection: (name) => ({
      where: (field, op, value) => ({
        get: async () => ({
          docs: (mockGsqDocs[name] ?? [])
            .filter((doc) => doc.data[field] === value)
            .map((doc) => ({ id: doc.id, data: () => doc.data })),
        }),
      }),
    }),
  })),
}));

jest.mock('../services/supabase', () => ({
  supabaseService: { from: (...args) => mockSupabaseFrom(...args) },
}));

jest.mock('../services/clientSale', () => ({
  createClientSale: (...args) => mockCreateClientSale(...args),
}));

const { inboundShepherdsSale } = require('../integrations/shepherds');

// Resolves each supabase.from(table) call with the next result for that table.
const mockTables = (results) => {
  const queues = Object.fromEntries(
    Object.entries(results).map(([table, list]) => [table, [...list]]),
  );
  mockSupabaseFrom.mockImplementation((table) => {
    const result = queues[table]?.shift() ?? { data: null, error: null };
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: async () => result,
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  });
};

const app = express();
app.use(express.json());
app.all('/', inboundShepherdsSale);

const AGENT = { id: 'agent-1', email: 'agent@shepherds.com', active: true };
const body = {
  client_phone: '2025550100',
  agent_email: 'Agent@Shepherds.com',
  monthly_premium: 85.5,
};
const post = (payload = body, token = 'secret') =>
  request(app).post('/').set('Authorization', `Bearer ${token}`).send(payload);

beforeEach(() => {
  process.env.SHEPHERDS_TOKEN = 'secret';
  process.env.GSQ_SERVICE_ACCOUNT_KEY = '{}';
  mockGsqDocs = {};
  mockCreateClientSale.mockReset();
  mockCreateClientSale.mockResolvedValue({
    status: 201,
    body: { id: 'client-1' },
  });
  mockSupabaseFrom.mockReset();
});

describe('inboundShepherdsSale', () => {
  test('only accepts POST', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(405);
  });

  test('rejects a bad token', async () => {
    const res = await post(body, 'wrong');
    expect(res.status).toBe(401);
    expect(mockCreateClientSale).not.toHaveBeenCalled();
  });

  test('rejects a malformed body', async () => {
    const res = await post({
      client_phone: '555',
      agent_email: '',
      monthly_premium: 'x',
    });
    expect(res.status).toBe(400);
  });

  test('rejects when the phone was issued to a different agent', async () => {
    mockGsqDocs.leads = [
      { id: 'g1', data: { phone: body.client_phone, issuedTo: 'other@x.com' } },
    ];
    const res = await post();
    expect(res.status).toBe(404);
    expect(mockCreateClientSale).not.toHaveBeenCalled();
  });

  test('accepts a redistributed instant form lead and books the premium', async () => {
    mockGsqDocs.instant_form_leads = [
      {
        id: 'g2',
        data: {
          phone: body.client_phone,
          issuedTo: 'other@x.com',
          redistributedTo: ['agent@shepherds.com'],
        },
      },
    ];
    mockTables({
      agents: [{ data: AGENT, error: null }],
      leads: [
        {
          data: [
            {
              id: 'lead-1',
              first_name: 'Ada',
              last_name: 'Lovelace',
              phone: body.client_phone,
              lead_vendor_id: 'vendor-1',
            },
          ],
          error: null,
        },
      ],
      clients: [{ data: [], error: null }],
    });

    const res = await post();

    expect(res.status).toBe(201);
    expect(mockCreateClientSale).toHaveBeenCalledWith({
      agent: AGENT,
      client: expect.objectContaining({
        first_name: 'Ada',
        phone: body.client_phone,
        monthly_premium: 85.5,
        lead_vendor_id: 'vendor-1',
      }),
    });
  });

  test('does not book a retried sale twice', async () => {
    mockGsqDocs.leads = [
      {
        id: 'g1',
        data: { phone: body.client_phone, issuedTo: 'agent@shepherds.com' },
      },
    ];
    mockTables({
      agents: [{ data: AGENT, error: null }],
      leads: [
        { data: [{ id: 'lead-1', phone: body.client_phone }], error: null },
      ],
      clients: [{ data: [{ id: 'client-1' }], error: null }],
    });

    const res = await post();

    expect(res.status).toBe(200);
    expect(mockCreateClientSale).not.toHaveBeenCalled();
  });

  test('rejects when the agent has no crm lead for the phone', async () => {
    mockGsqDocs.leads = [
      {
        id: 'g1',
        data: { phone: body.client_phone, issuedTo: 'agent@shepherds.com' },
      },
    ];
    mockTables({
      agents: [{ data: AGENT, error: null }],
      leads: [{ data: [], error: null }],
    });

    const res = await post();

    expect(res.status).toBe(404);
    expect(mockCreateClientSale).not.toHaveBeenCalled();
  });
});
