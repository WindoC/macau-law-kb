import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

if (!supabaseServiceKey && typeof window === 'undefined') {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - admin functions will not work');
}

/**
 * Creates a Supabase client for client-side operations with anon key
 * Used for authentication and public operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Creates a Supabase client for server-side operations with service role key
 * Used for admin operations and bypassing RLS policies
 * WARNING: Only use this on the server side, never expose service key to client
 */
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Database table names as constants to avoid typos
 */
export const TABLES = {
  USERS: 'users',
  USER_SESSIONS: 'user_sessions',
  USER_CREDITS: 'user_credits',
  TOKEN_USAGE: 'token_usage',
  SEARCH_HISTORY: 'search_history',
  QA_HISTORY: 'qa_history',
  CONSULTANT_CONVERSATIONS: 'consultant_conversations',
  CONSULTANT_MESSAGES: 'consultant_messages',
  SYSTEM_SETTINGS: 'system_settings',
  ADMIN_LOGS: 'admin_logs',
  DOCUMENTS: 'documents',
  LAW: 'law',
  SCRAPING: 'scraping',
  CLASSIFY: 'classify'
} as const;

/**
 * RPC function names for vector search and other stored procedures
 */
export const RPC_FUNCTIONS = {
  MATCH_DOCUMENTS: 'match_documents'
} as const;
