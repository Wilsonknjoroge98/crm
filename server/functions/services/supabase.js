const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wtudzhfcxsorxqimarjb.supabase.co';

// Lazy-initialize so the client is only created on first use, after Firebase
// has injected env vars from .env into process.env.
let _serviceClient = null;
const supabaseService = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_serviceClient) {
        _serviceClient = createClient(
          SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
      }
      const value = _serviceClient[prop];
      return typeof value === 'function' ? value.bind(_serviceClient) : value;
    },
  },
);

const createPublicClient = (token) => {
  return createClient(SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: token },
    },
  });
};

module.exports = { supabaseService, createPublicClient };
