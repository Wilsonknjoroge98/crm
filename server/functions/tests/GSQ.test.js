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
  isLiveTransfer,
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

// The leads table both answers the aged-order source lookup and takes the
// insert; a plain fresh delivery never touches the lookup.
const makeLeadsTable = (insert, sourceResult = { data: [], error: null }) => {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    not: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn().mockResolvedValue(sourceResult),
  };
  return { insert, ...query };
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

  test.each([
    ['omitted', undefined, 'fresh'],
    ['banked', 'banked', 'banked'],
    ['31–90 day aged', 'aged_second', 'aged_second'],
    ['91–180 day aged', 'aged_third', 'aged_third'],
    ['an instant-form segment', 'instant_aged_third', 'aged_third'],
    ['unrecognised', 'bogus', 'fresh'],
  ])(
    'stores the delivery segment as gsq_segment when %s',
    async (_label, segment, expected) => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'lead_vendors') {
          return makeLookupQuery({ data: { id: 'vendor-id' }, error: null });
        }
        if (table === 'agents') {
          return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
        }
        if (table === 'leads') {
          return makeLeadsTable(insert);
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const request = makeRequest('67.35');
      if (segment !== undefined) {
        request.body.segment = segment;
      }

      const res = makeResponse();
      await inboundGSQ(request, res);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ gsq_segment: expected }),
      );
    },
  );

  test.each([
    ['omitted', undefined, null],
    ['blank', '', null],
    ['provided', 'Female', 'Female'],
  ])('passes funnel sex through as sex when %s', async (_label, sex, expected) => {
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
    if (sex !== undefined) {
      request.body.sex = sex;
    }

    await inboundGSQ(request, makeResponse());

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ sex: expected }),
    );
  });
});

describe('inboundGSQ aged order source', () => {
  const originalToken = process.env.GSQ_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_TOKEN = 'test-gsq-token';
    mockGetHyrosSource.mockResolvedValue('hyros-source');
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.GSQ_TOKEN;
    } else {
      process.env.GSQ_TOKEN = originalToken;
    }
  });

  const mockTables = (leadsTable) =>
    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'lead_vendors') {
        return makeLookupQuery({ data: { id: 'vendor-id' }, error: null });
      }
      if (table === 'agents') {
        return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
      }
      if (table === 'leads') {
        return leadsTable;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

  const sendAged = async (segment) => {
    const request = makeRequest('67.35');
    request.body.segment = segment;
    const res = makeResponse();
    await inboundGSQ(request, res);
    return res;
  };

  test.each(['aged_second', 'aged_third'])(
    'carries the fresh lead source over for %s without calling Hyros',
    async (segment) => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const leads = makeLeadsTable(insert, {
        data: [{ gsq_source: 'FE Grandkids v3' }],
        error: null,
      });
      mockTables(leads);

      const res = await sendAged(segment);

      expect(leads.eq).toHaveBeenCalledWith('gsq_id', 'gsq-test-id');
      expect(mockGetHyrosSource).not.toHaveBeenCalled();
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          gsq_source: 'FE Grandkids v3',
          gsq_segment: segment,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    },
  );

  test.each([
    ['no fresh lead has a source', { data: [], error: null }],
    ['the lookup fails', { data: null, error: { message: 'boom' } }],
  ])('falls back to Hyros when %s', async (_label, sourceResult) => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(makeLeadsTable(insert, sourceResult));

    await sendAged('aged_second');

    expect(mockGetHyrosSource).toHaveBeenCalledWith('2025550199');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ gsq_source: 'hyros-source' }),
    );
  });

  test.each(['fresh', 'banked'])(
    'still asks Hyros for a %s delivery',
    async (segment) => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const leads = makeLeadsTable(insert);
      mockTables(leads);

      await sendAged(segment);

      expect(leads.select).not.toHaveBeenCalled();
      expect(mockGetHyrosSource).toHaveBeenCalledWith('2025550199');
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ gsq_source: 'hyros-source' }),
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
        sex: null,
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
        sex: 'male',
        raw_fields: {
          coverage: '$100k_to_$250k',
          urgency: 'this_week',
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

describe('inboundGSQ brand', () => {
  const originalToken = process.env.GSQ_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GSQ_TOKEN = 'test-gsq-token';
    mockGetHyrosSource.mockResolvedValue('keyley-ad');
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.GSQ_TOKEN;
    } else {
      process.env.GSQ_TOKEN = originalToken;
    }
  });

  const makeKeyleyRequest = (overrides = {}) => ({
    headers: { authorization: 'Bearer test-gsq-token' },
    body: {
      brand: 'keyley',
      leadType: 'keyley',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '5125550101',
      state: 'Texas',
      dob: '1975-04-09',
      sex: 'Female',
      smoker: false,
      faceAmount: '215000',
      premium: '$39-$47',
      healthClass: 'P',
      issuedTo: 'agent@example.com',
      sold: false,
      verified: true,
      gsqId: '00000000-0000-4000-8000-000000000010',
      beneficiary: 'Spouse or partner, Children',
      why: 'Mortgage protection',
      mortgageBalance: 212340,
      mortgageBalanceAdjusted: false,
      mortgageYearsLeft: 22,
      termYears: 20,
      homeowner: true,
      address: '1208 Maple St',
      city: 'Austin',
      zip: '78701',
      homeValue: 400000,
      homeEquity: 187660,
      homeValueConfidence: 82,
      recordOwners: ['JANE A DOE', 'JOHN DOE'],
      ownerNameMatch: true,
      ...overrides,
    },
  });

  // lead_vendors is never queried: house leads carry a brand instead
  const mockTables = (insert) =>
    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'agents') {
        return makeLookupQuery({ data: { id: 'agent-id' }, error: null });
      }
      if (table === 'leads') return makeLeadsTable(insert);
      throw new Error(`Unexpected table: ${table}`);
    });

  test('files a Keyley lead under its brand, mortgage answers in typed columns, Hyros source', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(insert);
    const res = makeResponse();

    await inboundGSQ(makeKeyleyRequest(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    // same Hyros account as GSQ: the Keyley ad is found by phone
    expect(mockGetHyrosSource).toHaveBeenCalledWith('5125550101');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'keyley',
        lead_vendor_id: null,
        face_amount: 215000,
        premium_min: 39,
        premium_max: 47,
        health_class: 'P',
        gsq_source: 'keyley-ad',
        gsq_instant_form: false,
        beneficiary: 'Spouse or partner, Children',
        why: 'Mortgage protection',
        mortgage_balance: 212340,
        mortgage_balance_adjusted: false,
        mortgage_years_left: 22,
        term_years: 20,
        homeowner: true,
        address: '1208 Maple St',
        city: 'Austin',
        zip: '78701',
        home_value: 400000,
        home_equity: 187660,
        home_value_confidence: 82,
        record_owners: ['JANE A DOE', 'JOHN DOE'],
        owner_name_match: true,
      }),
    );
    const payload = insert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('raw_fields');
    expect(payload).not.toHaveProperty('others_on_mortgage');
    expect(payload).not.toHaveProperty('street_address');
  });

  test('lands malformed or missing mortgage answers as null', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(insert);
    const res = makeResponse();

    await inboundGSQ(
      makeKeyleyRequest({
        mortgageBalance: 'lots',
        homeowner: 'yes',
        homeValueConfidence: 140,
        recordOwners: undefined,
        homeValue: null,
        address: { line1: '1208 Maple St', line2: 'Austin, TX 78701' },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        mortgage_balance: null,
        homeowner: null,
        home_value_confidence: null,
        record_owners: null,
        home_value: null,
        address: null,
      }),
    );
  });

  test('anything without brand keyley is a GSQ lead with no mortgage columns', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockTables(insert);
    const res = makeResponse();

    await inboundGSQ(makeRequest('67.35'), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'gsq', lead_vendor_id: null }),
    );
    expect(insert.mock.calls[0][0]).not.toHaveProperty('mortgage_balance');
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
    const keyley = makeDoc('keyley_leads', 'keyley-1', { phone: '2025550199' });
    mockCollections({
      leads: { phone: [funnel, alreadySold] },
      instant_form_leads: { phone: [instant] },
      keyley_leads: { phone: [keyley] },
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
      {
        name: 'keyley_leads',
        field: 'phone',
        op: 'in',
        values: ['(202) 555-0199', '2025550199'],
      },
    ]);
    // a sale flips the phone in both brands
    expect(batchUpdate).toHaveBeenCalledTimes(3);
    expect(batchUpdate).toHaveBeenCalledWith(funnel.ref, { sold: true });
    expect(batchUpdate).toHaveBeenCalledWith(instant.ref, { sold: true });
    expect(batchUpdate).toHaveBeenCalledWith(keyley.ref, { sold: true });
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

describe('isLiveTransfer', () => {
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

    await isLiveTransfer('(202) 555-0199', AGENT);

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

    await expect(isLiveTransfer('2025550199', AGENT)).resolves.toBe(true);
  });

  test('true for a logged call bridged to the selling agent', async () => {
    mockGSQ({ telnyx_logs: [bridgedCall()] });

    await expect(isLiveTransfer('2025550199', AGENT)).resolves.toBe(true);
  });

  test('false when the call was bridged to another agent', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ bridgedAgentEmail: 'other@example.com' })] });

    await expect(isLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
  });

  test('false when the caller never reached an agent', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ bridged: false })] });

    await expect(isLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
  });

  test.each(['leads', 'instant_form_leads'])(
    'false when the phone is already a gsq %s doc',
    async (collection) => {
      mockGSQ({
        telnyx_calls: [bridgedCall()],
        [collection]: [{ phone: '2025550199' }],
      });

      await expect(isLiveTransfer('2025550199', AGENT)).resolves.toBe(false);
    },
  );

  test('a Keyley sale checks only Keyley calls and Keyley leads', async () => {
    mockGSQ({});

    await isLiveTransfer('(202) 555-0199', AGENT, 'keyley');

    expect(whereCalls.map(({ name }) => name)).toEqual([
      'telnyx_calls',
      'telnyx_logs',
      'keyley_leads',
    ]);
  });

  test('true for a call bridged on the Keyley number for a Keyley sale', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ brandLabel: 'Keyley' })] });

    await expect(isLiveTransfer('2025550199', AGENT, 'keyley')).resolves.toBe(true);
  });

  test("a call on the other brand's number does not count", async () => {
    mockGSQ({ telnyx_calls: [bridgedCall({ brandLabel: 'Keyley' })] });
    await expect(isLiveTransfer('2025550199', AGENT, 'gsq')).resolves.toBe(false);

    mockGSQ({ telnyx_calls: [bridgedCall({ brandLabel: 'GSQ' })] });
    await expect(isLiveTransfer('2025550199', AGENT, 'keyley')).resolves.toBe(false);
  });

  test("a call from before brandLabel existed is GSQ's", async () => {
    mockGSQ({ telnyx_logs: [bridgedCall()] });

    await expect(isLiveTransfer('2025550199', AGENT, 'keyley')).resolves.toBe(false);
    await expect(isLiveTransfer('2025550199', AGENT, 'gsq')).resolves.toBe(true);
  });

  test('false for a Keyley sale when the phone is already a keyley_leads doc', async () => {
    mockGSQ({
      telnyx_calls: [bridgedCall({ brandLabel: 'Keyley' })],
      keyley_leads: [{ phone: '2025550199' }],
    });

    await expect(isLiveTransfer('2025550199', AGENT, 'keyley')).resolves.toBe(false);
  });

  test('false without an agent email, without querying gsq', async () => {
    mockGSQ({ telnyx_calls: [bridgedCall()] });

    await expect(isLiveTransfer('2025550199', undefined)).resolves.toBe(false);
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
