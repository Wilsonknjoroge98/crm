/* global beforeEach, describe, expect, jest, test */

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../services/supabase', () => ({ supabaseService: {} }));

// gsq.js PATCH builds its own Firestore; sendblue.js uses setFirestoreFactory
const mockPatchDb = { collection: jest.fn(), doc: jest.fn() };
jest.mock('firebase-admin/firestore', () => ({
  Firestore: jest.fn(() => mockPatchDb),
  FieldValue: {},
  Timestamp: {},
}));
jest.mock('../integrations/GSQ', () => ({ SUPER_ADMIN_EMAIL: 'admin@x.com' }));

const express = require('express');
const request = require('supertest');
const {
  getAgentSendblueKeys,
  setFirestoreFactory,
} = require('../integrations/sendblue');
const gsqRouter = require('../endpoints/gsq');

const EMAIL = 'Agent@Example.com';

// collections: { [collection]: { [docId]: data } }
const mockGsq = (collections, { fail = false } = {}) => {
  const collection = jest.fn((name) => ({
    doc: jest.fn((id) => ({
      get: fail ?
        jest.fn().mockRejectedValue(new Error('firestore down')) :
        jest.fn().mockResolvedValue({
          exists: Boolean(collections[name]?.[id]),
          data: () => collections[name]?.[id],
        }),
    })),
  }));
  setFirestoreFactory(() => ({ collection }));
  return collection;
};

const keys = {
  apiKey: 'key-123',
  apiSecret: 'secret-456',
  sendblueNumber: '+15125550100',
};
const withKeys = { sendblue_config: { 'agent@example.com': keys } };

const makeApp = (email = EMAIL, { line = keys.sendblueNumber } = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.agent = {
      first_name: 'Ann',
      last_name: 'Agent',
      npn: '1',
      sendblue_number: line,
    };
    req.supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue(
          email ?
            { data: { user: { email } }, error: null } :
            { data: { user: null }, error: new Error('no session') },
        ),
      },
    };
    next();
  });
  app.use('/gsq', gsqRouter);
  return app;
};

beforeEach(() => {
  process.env.SEND_BLUE_API_KEY = 'shared-key';
  process.env.SEND_BLUE_SECRET_KEY = 'shared-secret';
  process.env.GSQ_SERVICE_ACCOUNT_KEY = '{}';
});

describe('getAgentSendblueKeys', () => {
  test('returns the subaccount keys by lowercased email', async () => {
    mockGsq(withKeys);
    await expect(getAgentSendblueKeys(EMAIL)).resolves.toEqual({
      configured: true,
      ...keys,
    });
  });

  test('never falls back to the shared account keys', async () => {
    mockGsq({});
    const result = await getAgentSendblueKeys(EMAIL);
    expect(result).toEqual({ configured: false });
    expect(JSON.stringify(result)).not.toContain('shared');
  });
});

describe('GET /gsq/sendblue-config', () => {
  test('returns the keys for the session user, uncached', async () => {
    mockGsq(withKeys);
    const res = await request(makeApp()).get('/gsq/sendblue-config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ configured: true, ...keys });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('returns keys with dispatch off', async () => {
    mockGsq({ ...withKeys, agents: { [EMAIL]: { sendBlueEnabled: false } } });
    const res = await request(makeApp()).get('/gsq/sendblue-config');
    expect(res.status).toBe(200);
    expect(res.body.apiKey).toBe(keys.apiKey);
  });

  test('ignores an email in the query string', async () => {
    const collection = mockGsq(withKeys);
    await request(makeApp())
      .get('/gsq/sendblue-config')
      .query({ email: 'other@example.com' });
    const docIds = collection.mock.results.flatMap((r) =>
      r.value.doc.mock.calls.map(([id]) => id),
    );
    expect(docIds).not.toContain('other@example.com');
  });

  test('403 when the agent has no line', async () => {
    const collection = mockGsq(withKeys);
    const res = await request(makeApp(EMAIL, { line: null })).get(
      '/gsq/sendblue-config',
    );
    expect(res.status).toBe(403);
    expect(collection).not.toHaveBeenCalled();
  });

  test('403 without a session', async () => {
    mockGsq(withKeys);
    const res = await request(makeApp(null)).get('/gsq/sendblue-config');
    expect(res.status).toBe(403);
  });

  test('503 when firestore fails', async () => {
    mockGsq({}, { fail: true });
    const res = await request(makeApp()).get('/gsq/sendblue-config');
    expect(res.status).toBe(503);
  });
});

describe('PATCH /gsq sendBlueEnabled', () => {
  // configDocs: sendblue_config docs that exist, keyed by doc id
  const setupPatchDb = (configDocs) => {
    const update = jest.fn().mockResolvedValue();
    mockPatchDb.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue({ exists: true }),
      update,
    });
    const configDoc = jest.fn((id) => ({
      get: jest.fn().mockResolvedValue({ exists: Boolean(configDocs[id]) }),
    }));
    mockPatchDb.collection.mockImplementation((name) =>
      name === 'agents' ?
        {
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        } :
        { doc: configDoc },
    );
    return { update, configDoc };
  };

  const patch = (sendBlueEnabled) =>
    request(makeApp())
      .patch('/gsq')
      .send({ account: { email: EMAIL, sendBlueEnabled } });

  test('turns dispatch on when the line is provisioned', async () => {
    const { update, configDoc } = setupPatchDb({ 'agent@example.com': {} });
    const res = await patch(true);
    expect(res.status).toBe(200);
    expect(configDoc).toHaveBeenCalledWith('agent@example.com');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ sendBlueEnabled: true }),
    );
  });

  test('turns dispatch off without a config check', async () => {
    const { update } = setupPatchDb({});
    const res = await patch(false);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ sendBlueEnabled: false }),
    );
  });

  test('422 when enabling before the line is provisioned', async () => {
    const { update } = setupPatchDb({});
    const res = await patch(true);
    expect(res.status).toBe(422);
    expect(res.body.crm).toBe('sendBlueEnabled');
    expect(update).not.toHaveBeenCalled();
  });
});
