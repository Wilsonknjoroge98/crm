import { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      agent?: {
        id: string;
        org_id: string;
        email: string;
        first_name: string;
        last_name: string;
        npn: string;
        level: number;
        upline_agent_id: string | null;
        active: boolean;
        created_at: string;
        updated_at: string;
      };
      user?: {
        id: string;
        role: string;
      };
      supabase?: SupabaseClient;
      logData?: {
        route: string;
        method: string;
        requesterId: string;
      };
    }
  }
}

export {};
