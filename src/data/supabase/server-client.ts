import { createClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

// Server-only Supabase URL and Service Key
// Do NOT use NEXT_PUBLIC_* on the server to avoid leaking values into server bundles
const supabaseUrl = process.env.SUPABASE_URL!;
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
