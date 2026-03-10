const { createClient } = require('@supabase/supabase-js');
const supabaseService = createClient(
  'https://wtudzhfcxsorxqimarjb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const createPublicClient = (token) => {
  return createClient(
    'https://wtudzhfcxsorxqimarjb.supabase.co',
    'sb_publishable_yTHqyCuGdHs6m64SY7EVUg_Lfq-bhwI',
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
