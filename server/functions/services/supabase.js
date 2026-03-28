const { createClient } = require('@supabase/supabase-js');
const supabaseService = createClient(
  'https://wtudzhfcxsorxqimarjb.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
);
const createPublicClient = (token) => {
  return createClient(
    'https://wtudzhfcxsorxqimarjb.supabase.co',
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: token,
        },
      },
    },
  );
};
module.exports = { supabaseService, createPublicClient };
