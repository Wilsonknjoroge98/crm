import { QueryClient } from '@tanstack/react-query';

import { sessionRecovery } from './sessionRecovery.js';

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: sessionRecovery.shouldRetryQuery },
    // Keep mutations (especially message sends) non-retryable.
    mutations: { retry: false },
  },
});

export default client;
