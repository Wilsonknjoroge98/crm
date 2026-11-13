/* global describe, test, expect */

const express = require('express');
const request = require('supertest');

const { createRateLimiter } = require('../middleware/rateLimit');

const makeApp = (options) => {
  const app = express();
  app.get('/', createRateLimiter(options), (req, res) =>
    res.json({ ok: true }),
  );
  return app;
};

describe('createRateLimiter', () => {
  test('lets a caller through up to the limit, then answers 429', async () => {
    const app = makeApp({ windowMs: 60000, max: 2, now: () => 0 });
    const from = (ip) => request(app).get('/').set('X-Forwarded-For', ip);

    expect((await from('1.1.1.1')).status).toBe(200);
    expect((await from('1.1.1.1')).status).toBe(200);
    const blocked = await from('1.1.1.1');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBe('60');
    expect(blocked.body.error).toMatch(/too many requests/i);
  });

  test('counts each caller separately', async () => {
    const app = makeApp({ windowMs: 60000, max: 1, now: () => 0 });
    const from = (ip) => request(app).get('/').set('X-Forwarded-For', ip);

    expect((await from('1.1.1.1')).status).toBe(200);
    expect((await from('2.2.2.2')).status).toBe(200);
    expect((await from('1.1.1.1')).status).toBe(429);
  });

  test('starts over when the window ends', async () => {
    let time = 0;
    const app = makeApp({ windowMs: 60000, max: 1, now: () => time });
    const from = (ip) => request(app).get('/').set('X-Forwarded-For', ip);

    expect((await from('1.1.1.1')).status).toBe(200);
    expect((await from('1.1.1.1')).status).toBe(429);
    time = 60000;
    expect((await from('1.1.1.1')).status).toBe(200);
  });

  test('goes by the last forwarded address, which a caller cannot forge', async () => {
    const app = makeApp({ windowMs: 60000, max: 1, now: () => 0 });
    const from = (header) =>
      request(app).get('/').set('X-Forwarded-For', header);

    expect((await from('9.9.9.9, 1.1.1.1')).status).toBe(200);
    // a different made-up first entry, same real address
    expect((await from('8.8.8.8, 1.1.1.1')).status).toBe(429);
  });
});
