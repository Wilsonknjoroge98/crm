/* global describe, expect, test */

const {
  buildLead,
} = require('../endpoints/bulk_upload/import_book');
const {
  validateFormat,
} = require('../endpoints/bulk_upload/format_validation');

const makePersonRow = (leadPremium) => ({
  'Full Name': 'TEST Premium Example',
  'Email': 'fake.premium@example.com',
  'Phone': '2025550198',
  'Date of Birth': '1960-01-01',
  'Address': '100 FAKE Data Lane',
  'City': 'Sacramento',
  'State': 'California',
  'Zip Code': '95814',
  'Occupation': 'Synthetic Test Record',
  'Marital Status': 'single',
  'Annual Income': '50000',
  'Lead Vendor': 'Self Generated',
  'Lead Premium': leadPremium,
});

describe('bulk-upload lead premiums', () => {
  test.each([
    [
      '67.35',
      { premium: 67.35, premium_min: null, premium_max: null },
    ],
    [
      '50 - 75',
      { premium: null, premium_min: 50, premium_max: 75 },
    ],
  ])('maps %s into lead premium columns', (input, expected) => {
    const lead = buildLead(
      makePersonRow(input),
      'agent-id',
      'vendor-id',
    );

    expect(lead).toEqual(expect.objectContaining(expected));
  });

  test('accepts a valid Lead Premium range', () => {
    expect(validateFormat([makePersonRow('60.50 - 80.75')])).toEqual(
      expect.objectContaining({ error: false }),
    );
  });

  test('rejects malformed Lead Premium values', () => {
    const result = validateFormat([
      makePersonRow('approximately 50'),
    ]);

    expect(result.error).toBe(true);
    expect(result.errors).toContainEqual({
      row: 2,
      message:
        'Lead Premium must be a number or a range such as 50 - 75',
    });
  });
});

describe('bulk-upload client rows', () => {
  test('owns the client and carries CSV notes onto the client row', () => {
    const { buildClient } = require('../endpoints/bulk_upload/import_book');
    const row = { ...makePersonRow('67.35'), Notes: 'Prefers evening calls' };

    const client = buildClient(row, 'lead-id', 'agent-id');

    expect(client).toEqual(
      expect.objectContaining({
        agent_id: 'agent-id',
        lead_id: 'lead-id',
        notes: 'Prefers evening calls',
        first_name: 'TEST',
        last_name: 'Premium Example',
      }),
    );
  });

  test('stores empty CSV notes as null', () => {
    const { buildClient } = require('../endpoints/bulk_upload/import_book');

    expect(buildClient(makePersonRow('67.35'), null, 'agent-id')).toEqual(
      expect.objectContaining({ agent_id: 'agent-id', lead_id: null, notes: null }),
    );
  });
});
