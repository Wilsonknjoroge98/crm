/* global jest, describe, test, expect, beforeEach */

const mockSupabaseFrom = jest.fn();
const mockMarkSoldInGSQ = jest.fn().mockResolvedValue(undefined);
const mockSendPurchaseToMeta = jest.fn().mockResolvedValue(undefined);
// gsq Firestore: which collection the pixel lookup read, and what it finds
const mockPixelLookup = { collections: [], docs: [] };

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  Firestore: jest.fn().mockImplementation(() => ({
    collection: (name) => {
      mockPixelLookup.collections.push(name);
      return {
        where: () => ({
          limit: () => ({
            get: async () => ({
              empty: mockPixelLookup.docs.length === 0,
              docs: mockPixelLookup.docs.map((doc) => ({ data: () => doc })),
            }),
          }),
        }),
      };
    },
  })),
}));

jest.mock('../services/supabase', () => ({
  supabaseService: { from: (...args) => mockSupabaseFrom(...args) },
}));

jest.mock('../integrations/GSQ', () => ({
  markSoldInGSQ: (...args) => mockMarkSoldInGSQ(...args),
  isLiveTransfer: jest.fn().mockResolvedValue(false),
}));

jest.mock('../integrations/hyros', () => ({
  getHyrosSource: jest.fn().mockResolvedValue(null),
}));

jest.mock('../integrations/pixel', () => ({
  sendPurchaseToMeta: (...args) => mockSendPurchaseToMeta(...args),
}));

const { createClientSale } = require('../services/clientSale');

// Each entry is the result of one supabase.from(table) call, in order.
const mockCalls = (results) => {
  const calls = [];
  mockSupabaseFrom.mockImplementation((table) => {
    const result = results[calls.length] ?? { data: null, error: null };
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
    calls.push({ table, query });
    return query;
  });
  return calls;
};

const AGENT = { id: 'agent-1', email: 'agent@shepherds.com' };
const CLIENT = {
  first_name: 'Frank',
  last_name: 'Doe',
  phone: '2025550100',
  monthly_premium: 22.03,
  lead_vendor_id: 'vendor-1',
};
const EXISTING_LEAD = {
  data: [{ id: 'lead-1', gsq_source: 'meta' }],
  error: null,
};

beforeEach(() => {
  process.env.GSQ_SERVICE_ACCOUNT_KEY = '{}';
  mockSupabaseFrom.mockReset();
  mockSendPurchaseToMeta.mockClear();
  mockPixelLookup.collections = [];
  mockPixelLookup.docs = [];
});

describe('createClientSale Purchase pixel', () => {
  const sale = async (leadBrand) => {
    mockPixelLookup.docs = [{ name: 'Frank Doe', phone: CLIENT.phone }];
    mockCalls([
      { data: [{ id: 'lead-1', gsq_source: 'ad', brand: leadBrand }], error: null },
      { data: { id: 'client-1', ...CLIENT }, error: null },
      { data: null, error: null },
    ]);
    return createClientSale({ agent: AGENT, client: { ...CLIENT } });
  };

  test("a Keyley sale is matched in keyley_leads and sent to Keyley's pixel", async () => {
    const { status } = await sale('keyley');

    expect(status).toBe(201);
    expect(mockPixelLookup.collections).toEqual(['keyley_leads']);
    expect(mockSendPurchaseToMeta).toHaveBeenCalledWith(
      22.03 * 12,
      expect.objectContaining({ phone: CLIENT.phone }),
      expect.objectContaining({ id: 'client-1' }),
      'keyley',
    );
  });

  test('a GSQ sale is matched in the funnel leads', async () => {
    await sale('gsq');

    expect(mockPixelLookup.collections).toEqual(['leads']);
    expect(mockSendPurchaseToMeta.mock.calls[0][3]).toBe('gsq');
  });

  test('an agent-sourced sale fires no pixel', async () => {
    await sale(null);

    expect(mockPixelLookup.collections).toEqual([]);
    expect(mockSendPurchaseToMeta).not.toHaveBeenCalled();
  });
});

describe('createClientSale saleSource', () => {
  test('stores the sale source on the client', async () => {
    const calls = mockCalls([
      EXISTING_LEAD,
      { data: { id: 'client-1', ...CLIENT }, error: null },
      { data: null, error: null },
    ]);

    const { status } = await createClientSale({
      agent: AGENT,
      client: { ...CLIENT },
      saleSource: 'shepherds',
    });

    expect(status).toBe(201);
    expect(calls[1].table).toBe('clients');
    expect(calls[1].query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-1', sale_source: 'shepherds' }),
    );
  });

  test('leaves sale_source out for crm-marked sales', async () => {
    const calls = mockCalls([
      EXISTING_LEAD,
      { data: { id: 'client-1', ...CLIENT }, error: null },
      { data: null, error: null },
    ]);

    await createClientSale({ agent: AGENT, client: { ...CLIENT } });

    expect(calls[1].query.insert.mock.calls[0][0]).not.toHaveProperty(
      'sale_source',
    );
  });

  test('a concurrent retry losing the unique index answers already recorded', async () => {
    const calls = mockCalls([
      EXISTING_LEAD,
      { data: null, error: { code: '23505', message: 'duplicate key' } },
      { data: [{ id: 'client-1' }], error: null },
    ]);

    const result = await createClientSale({
      agent: AGENT,
      client: { ...CLIENT },
      saleSource: 'shepherds',
    });

    expect(result).toEqual({
      status: 200,
      body: { message: 'Sale already recorded', clientId: 'client-1' },
    });
    expect(calls.map((c) => c.table)).toEqual(['leads', 'clients', 'clients']);
    expect(calls[2].query.eq).toHaveBeenCalledWith('sale_source', 'shepherds');
    expect(mockSendPurchaseToMeta).not.toHaveBeenCalled();
  });

  test('a unique violation without a sale source is still an error', async () => {
    mockCalls([
      EXISTING_LEAD,
      { data: null, error: { code: '23505', message: 'duplicate key' } },
    ]);

    const { status } = await createClientSale({
      agent: AGENT,
      client: { ...CLIENT },
    });

    expect(status).toBe(500);
  });
});
