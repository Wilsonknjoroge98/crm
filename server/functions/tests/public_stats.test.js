/* global jest, describe, test, expect */

const express = require('express');
const request = require('supertest');

jest.mock('firebase-functions/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const { createPublicStatsRouter } = require('../endpoints/public_stats');

// A supabase whose clients query resolves `pages` in order (one per
// .range() call); an Error in the list rejects that read.
const makeSupabase = (pages) => {
  let index = 0;
  const range = jest.fn(() => {
    const page = pages[Math.min(index, pages.length - 1)];
    index += 1;
    return Promise.resolve(
      page instanceof Error
        ? { data: null, error: page }
        : { data: page, error: null },
    );
  });
  const query = { select: () => query, order: () => query, range };
  return { from: jest.fn(() => query), range };
};

const makeApp = (options) => {
  const app = express();
  app.use(createPublicStatsRouter(options));
  return app;
};

describe('GET /public-stats', () => {
  test('annualises every client premium and counts the sales', async () => {
    const supabase = makeSupabase([
      [
        { id: 'a', monthly_premium: 100 },
        { id: 'b', monthly_premium: '68.40' },
        { id: 'c', monthly_premium: null },
      ],
    ]);
    const res = await request(makeApp({ supabase })).get('/public-stats');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalClosed: 2020.8, closedSales: 3 });
    expect(supabase.from).toHaveBeenCalledWith('clients');
  });

  test('reuses the answer until it is ten minutes old', async () => {
    const supabase = makeSupabase([
      [{ id: 'a', monthly_premium: 100 }],
      [{ id: 'a', monthly_premium: 200 }],
    ]);
    let time = 0;
    const app = makeApp({ supabase, now: () => time });

    await request(app).get('/public-stats');
    time = 9 * 60 * 1000;
    const second = await request(app).get('/public-stats');
    expect(second.body.data.totalClosed).toBe(1200);
    expect(supabase.range).toHaveBeenCalledTimes(1);

    time = 10 * 60 * 1000;
    const third = await request(app).get('/public-stats');
    expect(third.body.data.totalClosed).toBe(2400);
  });

  test('serves the last answer when a refresh fails', async () => {
    const supabase = makeSupabase([
      [{ id: 'a', monthly_premium: 100 }],
      new Error('db down'),
    ]);
    let time = 0;
    const app = makeApp({ supabase, now: () => time });

    await request(app).get('/public-stats');
    time = 11 * 60 * 1000;
    const res = await request(app).get('/public-stats');

    expect(res.status).toBe(200);
    expect(res.body.data.totalClosed).toBe(1200);
  });

  test('fails when there is no answer to give', async () => {
    const supabase = makeSupabase([new Error('db down')]);
    const res = await request(makeApp({ supabase })).get('/public-stats');

    expect(res.status).toBe(500);
    expect(res.body.data).toBeUndefined();
  });
});
