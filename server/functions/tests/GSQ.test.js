/* global beforeEach, afterAll, describe, expect, jest, test */

const mockGetHyrosSource = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../integrations/hyros', () => ({
  getHyrosSource: (...args) => mockGetHyrosSource(...args),
}));

jest.mock('../services/supabase', () => ({
  supabaseService: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

const { inboundGSQ } = require('../integrations/GSQ');
const { parsePremium } = require('../integrations/premium');

const makeLookupQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    single: jest.fn().mockResolvedValue(result),
  };
  return query;
};

const makeResponse = () => {
  const res = {
    status: jest.fn(() => res),
    send: jest.fn(() => res),
  };
  return res;
};

const makeRequest = (premium) => ({
  headers: { authorization: 'Bearer test-gsq-token' },
  body: {
    firstName: 'Test',
    lastName: 'Person',
    phone: '2025550199',
    state: 'California',
    email: 'test.person@example.com',
    dob: '1960-01-01',
    gsqId: 'gsq-test-id',
    issuedTo: 'agent@example.com',
    sold: false,
    premium,
  },
});

describe('parsePremium', () => {
  test.each([
    ['decimal string', '67.35', { raw: 67.35, min: null, max: null }],
    ['number', 67.35, { raw: 67.35, min: null, max: null }],
    ['zero string', '0', { raw: 0, min: null, max: null }],
    ['range', '50 - 75', { raw: null, min: 50, max: 75 }],
    ['compact range', '50-75', { raw: null, min: 50, max: 75 }],
    [
      'currency decimal range',
      '$50.25 – $75.50',
      { raw: null, min: 50.25, max: 75.5 },
    ],
    ['empty string', '', { raw: null, min: null, max: null }],
    ['missing value', undefined, { raw: null, min: null, max: null }],
    [
      'malformed value',
      '67.35 monthly',
      { raw: null, min: null, max: null },
    ],
    [
      'reversed range',
      '75 - 50',
      { raw: null, min: null, max: null },
    ],
    ['negative value', '-25', { raw: null, min: null, max: null }],
  ])('parses %s', (_label, input, expected) => {
    expect(parsePremium(input)).toEqual(expected);
  });
});

describe('inboundGSQ premium payload', () => {
  const originalToken = process.env.GSQ_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_TOKEN = 'test-gsq-token';
    mockGetHyrosSource.mockResolvedValue('test-source');
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.GSQ_TOKEN;
    } else {
      process.env.GSQ_TOKEN = originalToken;
    }
  });

  const makeDuplicateSupabase = (existingAgentId) => {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq: updateEq }));
    let leadsCalls = 0;

    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'lead_vendors') {
        return makeLookupQuery({ data: { id: 'vendor-id' }, error: null });
      }
      if (table === 'agents') {
        return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
      }
      if (table === 'leads') {
        leadsCalls += 1;
        if (leadsCalls === 1) {
          return {
            insert: jest.fn().mockResolvedValue({
              error: { code: '23505' },
            }),
          };
        }
        if (leadsCalls === 2) {
          return makeLookupQuery({
            data: {
              id: 'existing-lead',
              created_at: '2026-01-01',
              agent_id: existingAgentId,
            },
            error: null,
          });
        }
        return { update };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    return { update, updateEq };
  };

  test('keeps a duplicate phone with its current agent', async () => {
    const { update } = makeDuplicateSupabase('agent-id');
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Lead already exists and is assigned to this agent',
    });
    expect(update).not.toHaveBeenCalled();
  });

  test('reassigns a duplicate phone to the newly issued agent', async () => {
    const { update, updateEq } = makeDuplicateSupabase('other-agent');
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(update).toHaveBeenCalledWith({ agent_id: 'agent-id' });
    expect(updateEq).toHaveBeenCalledWith('id', 'existing-lead');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Lead updated successfully',
    });
  });

  test.each([
    [
      'a single amount',
      '67.35',
      { premium: 67.35, premium_min: null, premium_max: null },
    ],
    [
      'a range',
      '50 - 75',
      { premium: null, premium_min: 50, premium_max: 75 },
    ],
  ])('writes all three fields for %s', async (_label, premium, expected) => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'lead_vendors') {
        return makeLookupQuery({
          data: { id: 'vendor-id' },
          error: null,
        });
      }
      if (table === 'agents') {
        return makeLookupQuery({
          data: { id: 'agent-id' },
          error: null,
        });
      }
      if (table === 'leads') {
        return { insert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = makeResponse();
    await inboundGSQ(makeRequest(premium), res);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining(expected),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Lead created successfully',
    });
  });
});
