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

const { inboundGSQ, markSoldInGSQ } = require('../integrations/GSQ');
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
