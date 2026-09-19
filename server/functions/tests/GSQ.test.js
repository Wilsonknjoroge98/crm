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
    ['open-ended bucket', '100+', { raw: null, min: 100, max: null }],
    [
      'currency open-ended bucket',
      '$100 +',
      { raw: null, min: 100, max: null },
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

  // Current inboundGSQ looks up any existing lead for this phone *before*
  // ever inserting (select/eq/order/limit, not an insert-then-catch-23505
  // pattern), so the first `leads` call is always that lookup.
  const makeLeadsLookupQuery = (result) => {
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn().mockResolvedValue(result),
    };
    return query;
  };

  const makeDuplicateSupabase = ({
    existingAgentId,
    existingGsqId = 'gsq-test-id',
  }) => {
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
          return makeLeadsLookupQuery({
            data: [
              {
                id: 'existing-lead',
                agent_id: existingAgentId,
                gsq_id: existingGsqId,
              },
            ],
            error: null,
          });
        }
        return { update };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    return { update, updateEq };
  };

  test('keeps a duplicate phone with its current agent and gsq doc', async () => {
    // makeRequest's gsqId is 'gsq-test-id' — matching existingGsqId here
    // means this resubmission points at the same doc, so it's a true no-op.
    const { update } = makeDuplicateSupabase({ existingAgentId: 'agent-id' });
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Lead already exists and is assigned to this agent',
    });
    expect(update).not.toHaveBeenCalled();
  });

  test('reassigns a duplicate phone to the newly issued agent', async () => {
    const { update, updateEq } = makeDuplicateSupabase({
      existingAgentId: 'other-agent',
    });
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(update).toHaveBeenCalledWith({
      agent_id: 'agent-id',
      gsq_id: 'gsq-test-id',
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'existing-lead');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: 'Lead updated successfully',
    });
  });

  // Regression guard: a resubmission past gsq's 30-day duplicate window
  // (gsq/lead.js) is a brand-new doc even when it lands the same agent
  // again — gsq_id must follow it, or refund eligibility (which
  // dereferences gsq_id to read that doc's issuedTo) is left pointing at
  // a stale, superseded doc.
  test('refreshes a stale gsq_id even when the agent is unchanged', async () => {
    const { update, updateEq } = makeDuplicateSupabase({
      existingAgentId: 'agent-id',
      existingGsqId: 'old-gsq-id',
    });
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(update).toHaveBeenCalledWith({
      agent_id: 'agent-id',
      gsq_id: 'gsq-test-id',
    });
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
    let leadsCalls = 0;
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
        leadsCalls += 1;
        if (leadsCalls === 1) {
          return makeLeadsLookupQuery({ data: [], error: null });
        }
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

  test.each([
    ['omitted', undefined, null],
    ['provided', 'RP', 'RP'],
  ])(
    'passes healthClass through as health_class when %s',
    async (_label, healthClass, expected) => {
      const insert = jest.fn().mockResolvedValue({ error: null });
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
            return makeLeadsLookupQuery({ data: [], error: null });
          }
          return { insert };
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const request = makeRequest('67.35');
      if (healthClass !== undefined) {
        request.body.healthClass = healthClass;
      }

      const res = makeResponse();
      await inboundGSQ(request, res);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ health_class: expected }),
      );
    },
  );
});
