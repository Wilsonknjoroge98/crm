import { supabase } from './supabase.js';
import { createAuthRecovery } from './authRecovery.js';

export const sessionRecovery = createAuthRecovery({
  signOut: (options) => supabase.auth.signOut(options),
  // A full navigation also stops polling and clears in-memory query data.
  redirect: (path) => window.location.replace(path),
});
