/* global jest, describe, test, expect, beforeEach */

const mockPost = jest.fn();

jest.mock('axios', () => ({
  create: () => ({ post: (...args) => mockPost(...args) }),
}));

const {
  sendPurchaseToMeta,
  hash,
  normalizePhone,
  normalizeState,
} = require('../integrations/pixel');

const baseLead = {
  email: 'Jane.Doe@Example.com ',
  name: 'Jane',
  phone: '(555) 123-4567',
  state: 'Texas',
  birthYear: '1950',
  birthMonth: '3',
  birthDay: '7',
  sex: 'Female',
};

describe('pixel helpers', () => {
  test('hash returns undefined for empty values instead of throwing', () => {
    expect(hash(undefined)).toBeUndefined();
    expect(hash(null)).toBeUndefined();
    expect(hash('  ')).toBeUndefined();
    expect(hash('us')).toMatch(/^[a-f0-9]{64}$/);
  });

  test('normalizes phone and state for Meta matching', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('15551234567');
    expect(normalizePhone(15551234567)).toBe('15551234567');
    expect(normalizeState('TX')).toBe('tx');
    expect(normalizeState('Texas')).toBe('tx');
  });
});

describe('sendPurchaseToMeta', () => {
  beforeEach(() => mockPost.mockReset().mockResolvedValue({ data: {} }));

  test('sends the event when last name, zip and city are missing', async () => {
    await sendPurchaseToMeta(1200, baseLead, { state: null });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const userData = mockPost.mock.calls[0][1].data[0].user_data;
    expect(userData.em).toBe(hash('jane.doe@example.com'));
    expect(userData.ph).toBe(hash('15551234567'));
    expect(userData.db).toBe(hash('19500307'));
    expect(userData.st).toBe(hash('tx'));
    expect(userData.ge).toBe(hash('f'));
    expect(userData.ln).toBeUndefined();
    expect(userData.zp).toBeUndefined();
    expect(userData.ct).toBeUndefined();
  });

  test('uses the last word of multi-part names as last name', async () => {
    await sendPurchaseToMeta(
      1200,
      { ...baseLead, name: 'Mary  Ann Smith' },
      { zip: '75001-1234', city: 'Fort Worth', state: 'TX' },
    );
    const userData = mockPost.mock.calls[0][1].data[0].user_data;
    expect(userData.fn).toBe(hash('mary'));
    expect(userData.ln).toBe(hash('smith'));
    expect(userData.zp).toBe(hash('75001'));
    expect(userData.ct).toBe(hash('fortworth'));
  });
});
