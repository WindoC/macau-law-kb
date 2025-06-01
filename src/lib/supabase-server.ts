import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client for API routes
 * Uses service role key for admin operations
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nuvztbzcmjbfzlrrcjxb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dnp0YnpjbWpiZnpscnJjanhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE2NDk3MCwiZXhwIjoyMDYzNzQwOTcwfQ.xIFunes5NsTBD5mOlhkewsvPEHSWb3rsdjyygjnnAQ0',
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
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nuvztbzcmjbfzlrrcjxb.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dnp0YnpjbWpiZnpscnJjanhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjQ5NzAsImV4cCI6MjA2Mzc0MDk3MH0.ffViplJRShSXoHUA_ATgTvDrQdxes9N5BeEtMPOy5jU'
);
