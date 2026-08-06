/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const {
  createLeadRouter,
  buildLeadPayload,
} = require('../endpoints/leads');

class FakeQuery {
  constructor(result) {
    this.result = result;
    this.calls = [];
  }

  record(method, args) {
    this.calls.push({ method, args });
    return this;
  }

  insert(...args) {
    return this.record('insert', args);
  }

  update(...args) {
    return this.record('update', args);
  }

  select(...args) {
    return this.record('select', args);
  }

  eq(...args) {
    return this.record('eq', args);
  }

  maybeSingle(...args) {
    return this.record('maybeSingle', args);
  }

  then(resolve, reject) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const makeApp = (result, agent = { id: 'agent-1' }) => {
  const query = new FakeQuery(result);
  const supabase = {
    from: jest.fn(() => query),
  };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.agent = agent;
    next();
  });
  app.use('/leads', createLeadRouter({ supabase }));
  return { app, query, supabase };
};

const validLead = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone: '2025550100',
  date_of_birth: '1980-01-01',
  state: 'California',
  lead_vendor_id: 'vendor-1',
};

describe('lead payloads', () => {
  test('parses a premium range into its bounds', () => {
    expect(buildLeadPayload({ premium: '50 - 75' })).toEqual({
      payload: {
        premium: null,
        premium_min: 50,
        premium_max: 75,
      },
    });
  });

  test('keeps a single premium out of the range columns', () => {
    expect(buildLeadPayload({ premium: '68.75' })).toEqual({
      payload: {
        premium: 68.75,
        premium_min: null,
        premium_max: null,
      },
    });
  });
});

describe('POST /leads', () => {
  test('creates an owned unsold lead and ignores protected fields', async () => {
    const created = { id: 'lead-1', ...validLead };
    const { app, query } = makeApp({ data: created, error: null });

    const response = await request(app)
      .post('/leads')
      .send({
        lead: {
          ...validLead,
          premium: '50 - 75',
          availability: 'Weekdays',
          agent_id: 'another-agent',
          sold: true,
          premium_min: 1,
          premium_max: 2,
          unexpected: 'not-a-lead-column',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: created });
    expect(query.calls[0]).toEqual({
      method: 'insert',
      args: [
        expect.objectContaining({
          first_name: 'Ada',
          agent_id: 'agent-1',
          sold: false,
          premium: null,
          premium_min: 50,
          premium_max: 75,
          availability: 'Weekdays',
        }),
      ],
    });
    expect(query.calls[0].args[0]).not.toHaveProperty('unexpected');
  });

  test('rejects missing required identity fields', async () => {
    const { app, supabase } = makeApp({ data: null, error: null });

    const response = await request(app)
      .post('/leads')
      .send({ lead: { first_name: 'Ada' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('last_name');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('rejects malformed premium input', async () => {
    const { app, supabase } = makeApp({ data: null, error: null });

    const response = await request(app)
      .post('/leads')
      .send({ lead: { ...validLead, premium: 'about sixty' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('premium');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('PATCH /leads/:id', () => {
  test('updates only editable fields and scopes the update to the agent', async () => {
    const updated = { id: 'lead-1', first_name: 'Grace' };
    const { app, query } = makeApp({ data: updated, error: null });

    const response = await request(app)
      .patch('/leads/lead-1')
      .send({
        lead: {
          first_name: ' Grace ',
          availability: 'Evenings',
          agent_id: 'another-agent',
          sold: true,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: updated });
    expect(query.calls).toContainEqual({
      method: 'update',
      args: [{ first_name: 'Grace', availability: 'Evenings' }],
    });
    expect(query.calls).toContainEqual({
      method: 'eq',
      args: ['id', 'lead-1'],
    });
    expect(query.calls).toContainEqual({
      method: 'eq',
      args: ['agent_id', 'agent-1'],
    });
  });

  test.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['null', null],
  ])('rejects emptying a required field with %s', async (_label, value) => {
    const { app, supabase } = makeApp({ data: null, error: null });

    const response = await request(app)
      .patch('/leads/lead-1')
      .send({ lead: { email: value, availability: 'Evenings' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('email');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('clears all premium columns when premium is emptied', async () => {
    const updated = { id: 'lead-1', premium: null };
    const { app, query } = makeApp({ data: updated, error: null });

    const response = await request(app)
      .patch('/leads/lead-1')
      .send({ lead: { premium: '' } });

    expect(response.status).toBe(200);
    expect(query.calls).toContainEqual({
      method: 'update',
      args: [{ premium: null, premium_min: null, premium_max: null }],
    });
  });

  test('does not expose an unowned lead', async () => {
    const { app } = makeApp({ data: null, error: null });

    const response = await request(app)
      .patch('/leads/lead-2')
      .send({ lead: { email: 'new@example.com' } });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Lead not found' });
  });
});
