/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

const mockSupabaseFrom = jest.fn();
const mockMarkSoldInGSQ = jest.fn().mockResolvedValue(undefined);
const mockGetHyrosSource = jest.fn().mockResolvedValue(null);
const mockIsGSQLiveTransfer = jest.fn().mockResolvedValue(false);
const mockSendPurchaseToMeta = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../services/supabase', () => ({
  supabaseService: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

jest.mock('../integrations/GSQ', () => ({
  markSoldInGSQ: (...args) => mockMarkSoldInGSQ(...args),
  isGSQLiveTransfer: (...args) => mockIsGSQLiveTransfer(...args),
}));

jest.mock('../integrations/hyros', () => ({
  getHyrosSource: (...args) => mockGetHyrosSource(...args),
}));

jest.mock('../integrations/pixel', () => ({
  sendPurchaseToMeta: (...args) => mockSendPurchaseToMeta(...args),
}));

const clientRouter = require('../endpoints/clients');

// Each entry is one `supabase.from(table)` call, in the order the route
// under test is expected to make them. The query is chainable on every
// builder method and resolves `result` whether the caller ends the chain
// on maybeSingle() or awaits the query object directly.
const makeSupabase = (calls) => {
  let index = 0;
  const queries = [];
  const from = jest.fn((table) => {
    const call = calls[index];
    index += 1;
    const result = call ? call.result : { data: null, error: null };
    const query = {
      select: jest.fn(() => query),
      insert: jest.fn(() => query),
      update: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue(result),
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    queries.push({ table, query });
    return query;
  });
  return { from, queries, callCount: () => index };
};

const makeApp = (supabase) => {
  mockSupabaseFrom.mockImplementation(supabase.from);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = { id: 'agent-1', email: 'agent@example.com' };
    next();
  });
  app.use('/client', clientRouter);
  return app;
};

const baseClient = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone: '2025550100',
  state: 'CA',
  date_of_birth: '1990-01-01',
  monthly_premium: 0,
};

describe('POST /client', () => {
  // Refund gating lives in the business card (mark-sold is disabled while a
  // refund is requested or approved), not here.
  test('marks the matching lead sold in GSQ and creates the client', async () => {
    const supabase = makeSupabase([
      {
        result: {
          data: [{ id: 'lead-1', gsq_source: null }],
          error: null,
        },
      },
      {
        result: {
          data: { id: 'client-1', phone: baseClient.phone, monthly_premium: 0 },
          error: null,
        },
      },
      { result: { data: null, error: null } },
    ]);
    const app = makeApp(supabase);

    const res = await request(app)
      .post('/client')
      .send({ client: { ...baseClient, lead_vendor_id: 'other-vendor-id' } });

    expect(res.status).toBe(201);
    expect(mockMarkSoldInGSQ).toHaveBeenCalledWith(baseClient.phone, baseClient.email);
  });

  test('only links a lead issued to the requesting agent', async () => {
    const supabase = makeSupabase([
      { result: { data: [{ id: 'lead-1', gsq_source: null }], error: null } },
      { result: { data: { id: 'client-1', phone: baseClient.phone }, error: null } },
      { result: { data: null, error: null } },
    ]);
    const app = makeApp(supabase);

    const res = await request(app)
      .post('/client')
      .send({ client: { ...baseClient, lead_vendor_id: 'other-vendor-id' } });

    expect(res.status).toBe(201);
    const [leadLookup] = supabase.queries;
    expect(leadLookup.table).toBe('leads');
    expect(leadLookup.query.eq).toHaveBeenCalledWith('phone', baseClient.phone);
    expect(leadLookup.query.eq).toHaveBeenCalledWith('agent_id', 'agent-1');
  });

  test('creates a fresh sold lead when the only phone match belongs to another agent', async () => {
    // The lookup is scoped to agent-1, so another agent's lead comes back as
    // no rows and the route falls through to inserting its own lead.
    const supabase = makeSupabase([
      { result: { data: [], error: null } },
      { result: { data: { id: 'lead-new' }, error: null } },
      { result: { data: { id: 'client-1', phone: baseClient.phone }, error: null } },
      { result: { data: null, error: null } },
    ]);
    const app = makeApp(supabase);

    const res = await request(app)
      .post('/client')
      .send({ client: { ...baseClient, lead_vendor_id: 'other-vendor-id' } });

    expect(res.status).toBe(201);
    const [, leadInsert, clientInsert] = supabase.queries;
    expect(leadInsert.table).toBe('leads');
    expect(leadInsert.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: baseClient.phone,
        agent_id: 'agent-1',
        sold: true,
      }),
    );
    expect(clientInsert.table).toBe('clients');
    expect(clientInsert.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-new' }),
    );
  });

  describe('gsq live transfer', () => {
    const GSQ_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';

    const postNewGSQLead = async (body = {}) => {
      const supabase = makeSupabase([
        { result: { data: [], error: null } },
        { result: { data: { id: 'lead-new' }, error: null } },
        { result: { data: { id: 'client-1', phone: baseClient.phone }, error: null } },
        { result: { data: null, error: null } },
      ]);
      const app = makeApp(supabase);
      const res = await request(app)
        .post('/client')
        .send({ client: { ...baseClient, lead_vendor_id: GSQ_VENDOR_ID, ...body } });
      const [, leadInsert, clientInsert] = supabase.queries;
      return { res, leadInsert, clientInsert };
    };

    test('flags the new lead from gsq call logs', async () => {
      mockIsGSQLiveTransfer.mockResolvedValueOnce(true);

      const { res, leadInsert } = await postNewGSQLead();

      expect(res.status).toBe(201);
      expect(mockIsGSQLiveTransfer).toHaveBeenCalledWith(
        baseClient.phone,
        'agent@example.com',
      );
      expect(leadInsert.query.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gsq_live_transfer: true }),
      );
    });

    test('ignores a client-sent answer and keeps it off the client row', async () => {
      mockIsGSQLiveTransfer.mockResolvedValueOnce(false);

      const { res, leadInsert, clientInsert } = await postNewGSQLead({
        live_transfer: true,
      });

      expect(res.status).toBe(201);
      expect(leadInsert.query.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gsq_live_transfer: false }),
      );
      expect(clientInsert.query.insert.mock.calls[0][0]).not.toHaveProperty(
        'live_transfer',
      );
    });

    test('a failed lookup still creates the client', async () => {
      mockIsGSQLiveTransfer.mockRejectedValueOnce(new Error('firestore down'));

      const { res, leadInsert } = await postNewGSQLead();

      expect(res.status).toBe(201);
      expect(leadInsert.query.insert).toHaveBeenCalledWith(
        expect.objectContaining({ gsq_live_transfer: false }),
      );
    });
  });
});
