import { createClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables');
}

/**
 * Supabase client for server-side operations with elevated permissions
 * Use this in API routes and server components that require admin access
 * WARNING: Never expose this client to the browser
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
