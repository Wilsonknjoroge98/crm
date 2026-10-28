import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// realtime-js hands back an existing channel with the same topic, even one
// still leaving after removeChannel. A remount on the same topic (StrictMode,
// reopening a thread) would attach to that closing channel and go deaf, so
// every subscription gets a topic of its own.
let channelSeq = 0;
export const uniqueTopic = (name) => `${name}:${(channelSeq += 1)}`;
