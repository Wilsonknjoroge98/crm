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

const mockFirestoreCollection = jest.fn();
const mockFirestoreBatch = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  Firestore: jest.fn(() => ({
    collection: (...args) => mockFirestoreCollection(...args),
    batch: (...args) => mockFirestoreBatch(...args),
  })),
}));

jest.mock('../services/supabase', () => ({
  supabaseService: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

const {
  inboundGSQ,
  inboundSendblueNumber,
  markSoldInGSQ,
  isGSQLiveTransfer,
} = require('../integrations/GSQ');
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

  // Dedup lives in gsq now (30-day phone-issuance window ahead of this
  // endpoint) — inboundGSQ no longer looks up an existing lead by phone,
  // it always inserts.
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
      expect.objectContaining({ ...expected, gsq_instant_form: false }),
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
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'lead_vendors') {
          return makeLookupQuery({ data: { id: 'vendor-id' }, error: null });
        }
        if (table === 'agents') {
          return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
        }
        if (table === 'leads') {
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

describe('inboundGSQ instant form payload', () => {
  const originalToken = process.env.GSQ_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_TOKEN = 'test-gsq-token';
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.GSQ_TOKEN;
    } else {
      process.env.GSQ_TOKEN = originalToken;
    }
  });

  const makeInstantFormRequest = (overrides = {}) => ({
    headers: { authorization: 'Bearer test-gsq-token' },
    body: {
      leadType: 'instant_form',
      firstName: 'Cher',
      lastName: '',
      phone: '2025550199',
      state: '',
      issuedTo: 'agent@example.com',
      sold: false,
      verified: true,
      adId: '120200000000000001',
      adName: 'FE Grandkids v3',
      fields: {
        'do_you_use_tobacco?': 'no',
        'when_are_you_best_available?': 'morning',
        'what_is_your_coverage_for?': 'final_expenses',
        'what_is_your_age?': '67',
      },
      ...overrides,
    },
  });

  const mockTables = (insert) =>
    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'lead_vendors') {
        return makeLookupQuery({ data: { id: 'vendor-id' }, error: null });
      }
      if (table === 'agents') {
        return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
      }
      if (table === 'leads') {
        return { insert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

  test('accepts a lead with no last name, email or state', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(insert);

    const res = makeResponse();
    await inboundGSQ(makeInstantFormRequest(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Cher',
        last_name: null,
        email: null,
        state: null,
        date_of_birth: undefined,
        smoker: false,
        availability: 'morning',
        why: 'final_expenses',
        gsq_source: 'FE Grandkids v3',
        gsq_id: null,
        gsq_instant_form: true,
        raw_fields: { age: '67' },
      }),
    );
    expect(mockGetHyrosSource).not.toHaveBeenCalled();
  });

  // gsq runs more than one Meta form and each words its questions
  // differently; the row must land the same shape either way.
  test('canonicalises the second form\'s question keys', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(insert);

    const res = makeResponse();
    await inboundGSQ(
      makeInstantFormRequest({
        fields: {
          'do_you_use_tobacco?': 'yes',
          'why_do_you_need_life_insurance?': 'leave_a_legacy',
          'how_much_coverage_do_you_need?': '$100k_to_$250k',
          'how_soon_do_you_need_to_buy_coverage?': 'this_week',
          'select_your_sex_at_birth?': 'male',
          'what_is_your_age?': '72 years.',
          'a_question_we_have_not_mapped?': 'some_answer',
          'you_will_be_contacted_by_a_representative_of_get_senior_quotes_to_schedule_an_appointment._if_you_agree,_please_type_below_"i_agree"._':
            'I agree',
          'left_blank?': '   ',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        smoker: true,
        availability: null,
        why: 'leave_a_legacy',
        raw_fields: {
          coverage: '$100k_to_$250k',
          urgency: 'this_week',
          sex: 'male',
          age: '72',
          'a_question_we_have_not_mapped?': 'some_answer',
        },
      }),
    );
  });

  test('still rejects an instant form lead with no first name', async () => {
    const insert = jest.fn();
    mockTables(insert);

    const res = makeResponse();
    await inboundGSQ(makeInstantFormRequest({ firstName: '' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(insert).not.toHaveBeenCalled();
  });

  test('funnel leads still require last name, email and state', async () => {
    const insert = jest.fn();
    mockTables(insert);

    const request = makeRequest('67.35');
    request.body.email = '';

    const res = makeResponse();
    await inboundGSQ(request, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('markSoldInGSQ', () => {
  const originalKey = process.env.GSQ_SERVICE_ACCOUNT_KEY;

  const makeDoc = (collection, id, data) => ({
    id,
    data: () => data,
    ref: { id, parent: { id: collection } },
  });

  let batchUpdate;
  let batchCommit;
  let whereCalls;

  const mockCollections = (byCollection) => {
    whereCalls = [];
    mockFirestoreCollection.mockImplementation((name) => ({
      where: (field, op, values) => {
        whereCalls.push({ name, field, op, values });
        const docs = (byCollection[name]?.[field] ?? []).filter((doc) =>
          values.includes(doc.data()[field]),
        );
        return { get: jest.fn().mockResolvedValue({ docs }) };
      },
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_SERVICE_ACCOUNT_KEY = '{}';
    batchUpdate = jest.fn();
    batchCommit = jest.fn().mockResolvedValue();
    mockFirestoreBatch.mockImplementation(() => ({
      update: batchUpdate,
      commit: batchCommit,
    }));
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.GSQ_SERVICE_ACCOUNT_KEY;
    } else {
      process.env.GSQ_SERVICE_ACCOUNT_KEY = originalKey;
    }
  });

  test('marks the phone sold in every lead collection', async () => {
    const funnel = makeDoc('leads', 'funnel-1', { phone: '2025550199' });
    const instant = makeDoc('instant_form_leads', 'meta-1', {
      phone: '2025550199',
    });
    const alreadySold = makeDoc('leads', 'funnel-0', {
      phone: '2025550199',
      sold: true,
    });
    mockCollections({
      leads: { phone: [funnel, alreadySold] },
      instant_form_leads: { phone: [instant] },
    });

    await markSoldInGSQ('(202) 555-0199', 'someone@example.com');

    expect(whereCalls).toEqual([
      {
        name: 'leads',
        field: 'phone',
        op: 'in',
        values: ['(202) 555-0199', '2025550199'],
      },
      {
        name: 'instant_form_leads',
        field: 'phone',
        op: 'in',
        values: ['(202) 555-0199', '2025550199'],
      },
    ]);
    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledWith(funnel.ref, { sold: true });
    expect(batchUpdate).toHaveBeenCalledWith(instant.ref, { sold: true });
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  test('falls back to email across collections when no phone matches', async () => {
    const instant = makeDoc('instant_form_leads', 'meta-1', {
      email: 'someone@example.com',
    });
    mockCollections({ instant_form_leads: { email: [instant] } });

    await markSoldInGSQ('2025550199', 'someone@example.com');

    expect(batchUpdate).toHaveBeenCalledWith(instant.ref, { sold: true });
  });

  test('writes nothing when nothing matches', async () => {
    mockCollections({});

    await markSoldInGSQ('2025550199', 'someone@example.com');

    expect(mockFirestoreBatch).not.toHaveBeenCalled();
  });
});

describe('isGSQLiveTransfer', () => {
  const originalKey = process.env.GSQ_SERVICE_ACCOUNT_KEY;
  const AGENT = 'agent@example.com';
  const PHONE = '+12025550199';
  let whereCalls;

  const mockGSQ = (byCollection) => {
    whereCalls = [];
    mockFirestoreCollection.mockImplementation((name) => ({
      where: (field, op, values) => {
        whereCalls.push({ name, field, op, values });
        const docs = (byCollection[name] ?? [])
          .filter((data) => values.includes(data[field]))
          .map((data) => ({ data: () => data }));
        return { get: jest.fn().mockResolvedValue({ docs }) };
      },
    }));
  };

  const bridgedCall = (overrides = {}) => ({
    callerPhone: PHONE,
    bridged: true,
    bridgedAgentEmail: AGENT,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_SERVICE_ACCOUNT_KEY = '{}';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.GSQ_SERVICE_ACCOUNT_KEY;
    } else {
      process.env.GSQ_SERVICE_ACCOUNT_KEY = originalKey;
    }
  });

  test('matches the e164 caller phone and the bare lead phone', async () => {
    mockGSQ({});

    await isGSQLiveTransfer('(202) 555-0199', AGENT);

    const leadPhones = ['(202) 555-0199', '2025550199'];
    const callerPhones = [...leadPhones, PHONE];
    expect(whereCalls).toEqual([
      { name: 'telnyx_calls', field: 'callerPhone', op: 'in', values: callerPhones },
      { name: 'telnyx_logs', field: 'callerPhone', op: 'in', values: callerPhones },
      { name: 'leads', field: 'phone', op: 'in', values: leadPhones },
      { name: 'instant_form_leads', field: 'phone', op: 'in', values: leadPhones },
    ]);
  });

  test('true for a call bridged to the selling agent', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ bridgedAgentEmail: 'Agent@Example.com' })] });

    await expect(isGSQLiveTransfer('2025550199', AGENT)).resolves.toBe(true);
  });

  test('true for a logged call bridged to the selling agent', async () => {
    mockGSQ({ telnyx_logs: [bridgedCall()] });

    await expect(isGSQLiveTransfer('2025550199', AGENT)).resolves.toBe(true);
  });

  test('false when the call was bridged to another agent', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ bridgedAgentEmail: 'other@example.com' })] });

    await expect(isGSQLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
  });

  test('false when the caller never reached an agent', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ bridged: false })] });

    await expect(isGSQLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
  });

  test.each(['leads', 'instant_form_leads'])(
    'false when the phone is already a gsq %s doc',
    async (collection) => {
      mockGSQ({
        telnyx_calls: [bridgedCall()],
        [collection]: [{ phone: '2025550199' }],
      });

      await expect(isGSQLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
    },
  );

  test('false without an agent email, without querying gsq', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall()] });

    await expect(isGSQLiveTransfer('2025550199', undefined)).resolves.toBe(false);
    expect(whereCalls).toEqual([]);
  });
});

describe('inboundSendblueNumber', () => {
  const originalToken = process.env.GSQ_TOKEN;

  const makeSyncRequest = (body, token = 'test-gsq-token') => ({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body,
  });

  const mockAgentsTable = (lookupResult, updateResult = { error: null }) => {
    const update = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue(updateResult),
    }));
    const ilike = jest.fn().mockResolvedValue(lookupResult);
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({ ilike })),
      update,
    }));
    return { ilike, update };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_TOKEN = 'test-gsq-token';
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.GSQ_TOKEN;
    } else {
      process.env.GSQ_TOKEN = originalToken;
    }
  });

  test('rejects a bad token', async () => {
    const res = makeResponse();
    await inboundSendblueNumber(
      makeSyncRequest({ email: 'a@x.com', sendblueNumber: '+14155551234' }, 'nope'),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test.each([
    ['missing email', { sendblueNumber: '+14155551234' }],
    ['10 digit number', { email: 'a@x.com', sendblueNumber: '4155551234' }],
    ['non-US number', { email: 'a@x.com', sendblueNumber: '+447700900123' }],
  ])('rejects %s', async (_label, body) => {
    const res = makeResponse();
    await inboundSendblueNumber(makeSyncRequest(body), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('updates the agent matched case-insensitively with wildcards escaped', async () => {
    const { ilike, update } = mockAgentsTable({
      data: [{ id: 'agent-1', sendblue_number: null }],
      error: null,
    });
    const res = makeResponse();

    await inboundSendblueNumber(
      makeSyncRequest({ email: ' Jane_Doe@X.com ', sendblueNumber: '+14155551234' }),
      res,
    );

    expect(ilike).toHaveBeenCalledWith('email', 'jane\\_doe@x.com');
    expect(update).toHaveBeenCalledWith({ sendblue_number: '+14155551234' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('is a no-op when the number is already set', async () => {
    const { update } = mockAgentsTable({
      data: [{ id: 'agent-1', sendblue_number: '+14155551234' }],
      error: null,
    });
    const res = makeResponse();

    await inboundSendblueNumber(
      makeSyncRequest({ email: 'a@x.com', sendblueNumber: '+14155551234' }),
      res,
    );

    expect(update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('404s when no crm agent has the email', async () => {
    const { update } = mockAgentsTable({ data: [], error: null });
    const res = makeResponse();

    await inboundSendblueNumber(
      makeSyncRequest({ email: 'nobody@x.com', sendblueNumber: '+14155551234' }),
      res,
    );

    expect(update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('409s instead of guessing when several agents share the email', async () => {
    const { update } = mockAgentsTable({
      data: [{ id: 'agent-1' }, { id: 'agent-2' }],
      error: null,
    });
    const res = makeResponse();

    await inboundSendblueNumber(
      makeSyncRequest({ email: 'dup@x.com', sendblueNumber: '+14155551234' }),
      res,
    );

    expect(update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
