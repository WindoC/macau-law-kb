import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client for API routes
 * Uses service role key for admin operations
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_supabase_service_role_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Client-side compatible Supabase client for server operations
 * Uses anon key for user operations
 */
export const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key'
);
