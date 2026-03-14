const { createClient } = require('@supabase/supabase-js');
const supabaseService = createClient(
  'https://wtudzhfcxsorxqimarjb.supabase.co',
  'sb_secret_M_1uU05asQmaCOO5jsqtYA_J9WYMss7',
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
