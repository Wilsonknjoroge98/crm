/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

const mockSupabaseFrom = jest.fn();
const mockMarkSoldInGSQ = jest.fn().mockResolvedValue(undefined);
const mockGetHyrosSource = jest.fn().mockResolvedValue(null);
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
  const from = jest.fn(() => {
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
    return query;
  });
  return { from, callCount: () => index };
};

const makeApp = (supabase) => {
  mockSupabaseFrom.mockImplementation(supabase.from);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = { id: 'agent-1' };
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
});
