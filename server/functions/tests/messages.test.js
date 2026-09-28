/* global beforeEach, describe, expect, jest, test */

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const axios = require('axios');
const express = require('express');
const request = require('supertest');
const {
  getSendblueCredentials,
  setFirestoreFactory,
} = require('../integrations/sendblue');
const messagesRouter = require('../endpoints/messages');

const LINE = '+15125550100';
const LEAD = '+15125550199';

const mockConfigDocs = (docs, { fail = false } = {}) => {
  const doc = jest.fn((id) => ({
    get: fail ?
      jest.fn().mockRejectedValue(new Error('firestore down')) :
      jest.fn().mockResolvedValue({
        exists: Boolean(docs[id]),
        data: () => docs[id],
      }),
  }));
  const collection = jest.fn(() => ({ doc }));
  setFirestoreFactory(() => ({ collection }));
  return { collection, doc };
};

const makeApp = (agent) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.agent = agent;
    next();
  });
  app.use('/messages', messagesRouter);
  return app;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SEND_BLUE_API_KEY = 'shared-key';
  process.env.SEND_BLUE_SECRET_KEY = 'shared-secret';
});

describe('getSendblueCredentials', () => {
  test('returns per-account credentials from sendblue_config', async () => {
    const { collection, doc } = mockConfigDocs({
      'agent@example.com': {
        apiKey: 'sub-key',
        apiSecret: 'sub-secret',
        sendblueNumber: LINE,
      },
    });

    const credentials = await getSendblueCredentials(' Agent@Example.com ');

    expect(collection).toHaveBeenCalledWith('sendblue_config');
    expect(doc).toHaveBeenCalledWith('agent@example.com');
    expect(credentials).toEqual({
      apiKey: 'sub-key',
      apiSecret: 'sub-secret',
      sendblueNumber: LINE,
      source: 'sendblue_config',
    });
  });

  test('falls back to the shared account when there is no config doc', async () => {
    mockConfigDocs({});
    const credentials = await getSendblueCredentials('legacy@example.com');
    expect(credentials).toMatchObject({
      apiKey: 'shared-key',
      apiSecret: 'shared-secret',
      source: 'shared_account',
    });
  });

  test('falls back while provisioning has not saved credentials yet', async () => {
    mockConfigDocs({ 'new@example.com': { status: 'provisioning' } });
    const credentials = await getSendblueCredentials('new@example.com');
    expect(credentials.source).toBe('shared_account');
  });

  test('throws 503 instead of using the shared account when Firestore fails', async () => {
    mockConfigDocs({}, { fail: true });
    await expect(getSendblueCredentials('agent@example.com')).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe('messages endpoints', () => {
  const agent = { id: 'agent-1', email: 'agent@example.com', sendblue_number: LINE };

  test('GET reads the thread with the agent subaccount credentials', async () => {
    mockConfigDocs({
      'agent@example.com': { apiKey: 'sub-key', apiSecret: 'sub-secret', sendblueNumber: LINE },
    });
    axios.get.mockResolvedValue({
      data: {
        data: [
          { message_handle: 'b', content: 'hi back', is_outbound: true, sendblue_number: LINE },
          { message_handle: 'x', content: 'other line', sendblue_number: '+15125550111' },
          { message_handle: 'a', content: 'hi', is_outbound: false, sendblue_number: LINE },
        ],
      },
    });

    const res = await request(makeApp(agent)).get('/messages').query({ phone: '5125550199' });

    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.id)).toEqual(['a', 'b']);
    const [, options] = axios.get.mock.calls[0];
    expect(options.headers).toEqual({
      'sb-api-key-id': 'sub-key',
      'sb-api-secret-key': 'sub-secret',
    });
    expect(options.params).toMatchObject({ number: LEAD, sendblue_number: LINE });
  });

  test('POST sends with the agent subaccount credentials', async () => {
    mockConfigDocs({
      'agent@example.com': { apiKey: 'sub-key', apiSecret: 'sub-secret', sendblueNumber: LINE },
    });
    axios.post.mockResolvedValue({
      data: { message_handle: 'm1', content: 'hello', is_outbound: true, status: 'QUEUED' },
    });

    const res = await request(makeApp(agent))
      .post('/messages')
      .send({ phone: '(512) 555-0199', content: 'hello' });

    expect(res.status).toBe(201);
    const [, body, options] = axios.post.mock.calls[0];
    expect(body).toEqual({ from_number: LINE, number: LEAD, content: 'hello' });
    expect(options.headers['sb-api-key-id']).toBe('sub-key');
    expect(options.headers['sb-api-secret-key']).toBe('sub-secret');
  });

  test('legacy agent without sendblue_config keeps using the shared account', async () => {
    mockConfigDocs({});
    axios.post.mockResolvedValue({ data: { message_handle: 'm2', content: 'yo' } });

    const res = await request(makeApp({ ...agent, email: 'legacy@example.com' }))
      .post('/messages')
      .send({ phone: LEAD, content: 'yo' });

    expect(res.status).toBe(201);
    const [, , options] = axios.post.mock.calls[0];
    expect(options.headers['sb-api-key-id']).toBe('shared-key');
  });

  test('credential lookup failure returns 503 and never calls Sendblue', async () => {
    mockConfigDocs({}, { fail: true });

    const res = await request(makeApp(agent)).get('/messages').query({ phone: LEAD });

    expect(res.status).toBe(503);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('agent without a line still gets 409 before any credential lookup', async () => {
    const { collection } = mockConfigDocs({});

    const res = await request(makeApp({ ...agent, sendblue_number: null }))
      .get('/messages')
      .query({ phone: LEAD });

    expect(res.status).toBe(409);
    expect(collection).not.toHaveBeenCalled();
  });
});
