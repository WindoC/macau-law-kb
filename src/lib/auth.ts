import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase-server';

/**
 * User role types for the application
 */
export type UserRole = 'admin' | 'free_tier' | 'pay_tier' | 'vip_tier';

/**
 * User data structure returned by authentication
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  credits: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

/**
 * Authentication result structure
 */
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extracts the session token from the client-side Supabase session
 * This should be called on the client side to get the token for API requests
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get the session from localStorage where Supabase stores it
    const session = localStorage.getItem('sb-nuvztbzcmjbfzlrrcjxb-auth-token');
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    return parsed?.access_token || null;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}

/**
 * Authenticates a request using the Authorization header
 * Validates the token with Supabase and returns user information
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const token = authHeader.substring(7);
    if (!token) {
      return {
        success: false,
        error: 'No token provided'
      };
    }

    // Create a fresh Supabase client for token validation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nuvztbzcmjbfzlrrcjxb.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dnp0YnpjbWpiZnpscnJjanhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjQ5NzAsImV4cCI6MjA2Mzc0MDk3MH0.ffViplJRShSXoHUA_ATgTvDrQdxes9N5BeEtMPOy5jU';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token validation failed:', error);
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    // Get or create user profile using service role client
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }

    // Create user profile if it doesn't exist
    if (!userProfile) {
      const newUser = {
        id: user.id,
        email: user.email!,
        role: 'free_tier' as UserRole,
        credits: parseInt(process.env.DEFAULT_FREE_TOKENS || '1000'),
        tokens_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabaseServer
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return {
          success: false,
          error: 'Failed to create user profile'
        };
      }

      return {
        success: true,
        user: createdUser
      };
    }

    return {
      success: true,
      user: userProfile
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Middleware function to protect API routes
 * Returns the authenticated user or throws an error
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    throw new Error(authResult.error || 'Authentication required');
  }
  
  return authResult.user;
}

/**
 * Check if user has sufficient credits for an operation
 */
export function hasCredits(user: AuthenticatedUser, requiredCredits: number): boolean {
  return user.credits >= requiredCredits;
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  try {
    // First get current values
    const { data: currentUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('credits, tokens_used')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      console.error('Error fetching user for credit deduction:', fetchError);
      return false;
    }

    // Update with calculated values
    const { error } = await supabaseServer
      .from('users')
      .update({ 
        credits: currentUser.credits - amount,
        tokens_used: currentUser.tokens_used + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error deducting credits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deducting credits:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific feature based on their role
 */
export function hasFeatureAccess(user: AuthenticatedUser, feature: 'search' | 'qa' | 'consultant' | 'pro_model'): boolean {
  switch (feature) {
    case 'search':
    case 'qa':
      return true; // All users can access search and Q&A
    
    case 'consultant':
      return user.role !== 'free_tier'; // Only paid users can access consultant
    
    case 'pro_model':
      return user.role === 'vip_tier'; // Only VIP users can use pro model
    
    default:
      return false;
  }
}
