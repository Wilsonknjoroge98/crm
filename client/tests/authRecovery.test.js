import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { createAuthRecovery } from '../src/utils/authRecovery.js';

test('concurrent 401s clear only this session once, redirect once, and preserve errors', async () => {
  let signOuts = 0;
  const redirects = [];
  let releaseSignOut;
  const recovery = createAuthRecovery({
    signOut: (options) => {
      assert.deepEqual(options, { scope: 'local' });
      signOuts++;
      return new Promise((resolve) => { releaseSignOut = resolve; });
    },
    redirect: (path) => redirects.push(path),
  });
  const error = { response: { status: 401 } };
  const results = [recovery.onResponseError(error), recovery.onResponseError(error)];
  await Promise.resolve();
  assert.equal(signOuts, 1);
  assert.throws(() => recovery.beforeRequest({}), { status: 401 });
  // Even API wrappers which replace the original Axios error must not retry.
  assert.equal(recovery.shouldRetryQuery(0, new Error('wrapped')), false);
  releaseSignOut();
  for (const result of results) await assert.rejects(result, (e) => e === error);
  assert.deepEqual(redirects, ['/login']);
});

test('sign-out failure still redirects and rejects the original 401', async () => {
  for (const fails of [true, false]) {
    let redirected = false;
    const recovery = createAuthRecovery({
      signOut: async () => {
        if (fails) throw new Error('revoked session');
        return { error: new Error('revoked session') };
      },
      redirect: () => { redirected = true; },
    });
    const error = { response: { status: 401 } };
    await assert.rejects(recovery.onResponseError(error), (e) => e === error);
    assert.equal(redirected, true);
  }
});

test('non-401 errors do not clear sessions; other query retries retain their limit', async () => {
  const recovery = createAuthRecovery({
    signOut: () => assert.fail('unexpected signOut'),
    redirect: () => assert.fail('unexpected redirect'),
  });
  for (const status of [400, 403, 429, 500, 504]) {
    const error = { response: { status } };
    await assert.rejects(recovery.onResponseError(error), (e) => e === error);
    assert.equal(recovery.shouldRetryQuery(0, error), true);
    assert.equal(recovery.shouldRetryQuery(2, error), true);
    assert.equal(recovery.shouldRetryQuery(3, error), false);
  }
  assert.equal(recovery.shouldRetryQuery(0, { status: 401 }), false);
  assert.equal(recovery.shouldRetryQuery(0, { response: { status: 401 } }), false);
  const config = {};
  assert.equal(recovery.beforeRequest(config), config);
});

test('Axios + React Query make only one transport call for an unauthorized query', async () => {
  let calls = 0;
  let signOuts = 0;
  const recovery = createAuthRecovery({
    signOut: async () => { signOuts++; },
    redirect: () => {},
  });
  const api = axios.create({
    adapter: async () => {
      calls++;
      throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', {}, null, { status: 401 });
    },
  });
  api.interceptors.request.use(recovery.beforeRequest);
  api.interceptors.response.use((res) => res, recovery.onResponseError);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: recovery.shouldRetryQuery, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  try {
    await assert.rejects(client.fetchQuery({
      queryKey: ['revoked'],
      queryFn: () => api.get('/messages'),
    }));
    assert.equal(calls, 1);
    assert.equal(signOuts, 1);
    // Polling/queued requests are blocked while the browser navigates away.
    await assert.rejects(api.get('/messages'), { status: 401 });
    assert.equal(calls, 1);
  } finally {
    client.clear();
  }
});
