/* global beforeEach, describe, expect, jest, test */

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));
const mockGetUser = jest.fn();
jest.mock('../services/supabase', () => ({
  createPublicClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
  supabaseService: {},
}));
const logger = require('firebase-functions/logger');
const { authMiddleware } = require('../middleware/auth');

describe('auth middleware unauthorized sessions', () => {
  let res;
  let next;
  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    next = jest.fn();
  });

  test('missing header returns 401 with a warning', async () => {
    await authMiddleware({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test.each([null, { name: 'AuthSessionMissingError', message: 'Session missing', status: 401 }])(
    'missing or invalid user logs a safe warning',
    async (error) => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error });
      await authMiddleware({ headers: { authorization: 'Bearer private-token' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private-token');
      expect(next).not.toHaveBeenCalled();
    },
  );

  test('a thrown missing-session error is also a warning and 401', async () => {
    mockGetUser.mockRejectedValueOnce(Object.assign(new Error('Session missing'), {
      name: 'AuthSessionMissingError', status: 400,
    }));
    await authMiddleware({ headers: { authorization: 'Bearer private-token' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('unexpected failures remain server errors', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('unexpected'));
    await authMiddleware({ headers: { authorization: 'Bearer private-token' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
