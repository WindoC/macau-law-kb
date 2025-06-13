import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase-server';
import { AuthenticatedUser, AuthResult, UserRole } from './auth-client';

/**
 * Server-side authentication utilities
 * These functions should only be used in API routes and server-side code
 */

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }
    
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
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'free' as UserRole,
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

      // Create user credits record
      const defaultTokens = parseInt(process.env.DEFAULT_FREE_TOKENS || '1000');
      const { error: creditsError } = await supabaseServer
        .from('user_credits')
        .insert({
          user_id: user.id,
          total_tokens: defaultTokens,
          used_tokens: 0,
          remaining_tokens: defaultTokens,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (creditsError) {
        console.error('Error creating user credits:', creditsError);
        // Don't fail the authentication, just log the error
      }

      return {
        success: true,
        user: {
          ...createdUser,
          total_tokens: defaultTokens,
          used_tokens: 0,
          remaining_tokens: defaultTokens
        }
      };
    }

    // Get user credits
    const { data: userCredits } = await supabaseServer
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return {
      success: true,
      user: {
        ...userProfile,
        total_tokens: userCredits?.total_tokens || 0,
        used_tokens: userCredits?.used_tokens || 0,
        remaining_tokens: userCredits?.remaining_tokens || 0
      }
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
 * Deduct credits from user account
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  try {
    // Use the RPC function from the database schema
    const { error } = await supabaseServer.rpc('deduct_user_tokens', {
      user_id: userId,
      tokens_to_deduct: amount
    });

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
 * Validate HTTP method for API routes
 */
export function validateMethod(request: NextRequest, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method);
}

/**
 * Log API usage for monitoring and debugging
 */
export async function logAPIUsage(userId: string, endpoint: string, tokensUsed: number): Promise<void> {
  try {
    console.log(`API Usage - User: ${userId}, Endpoint: ${endpoint}, Tokens: ${tokensUsed}`);
    
    // Save to token_usage table
    await supabaseServer
      .from('token_usage')
      .insert({
        user_id: userId,
        feature_type: endpoint === 'search' ? 'legal_search' :
                     endpoint === 'qa' ? 'legal_qa' : 'legal_consultant',
        tokens_used: tokensUsed,
        model_used: endpoint === 'consultant' ? 'gemini-2.5-flash-preview-05-20' : 'gemini-embedding-exp-03-07',
        cost_usd: tokensUsed * 0.00001, // Rough estimate
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

/**
 * Generate CSRF token for form protection
 */
export function generateCSRFToken(): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
  
  return jwt.sign(
    {
      type: 'csrf',
      timestamp: Date.now()
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
    
    const decoded = jwt.verify(token, secret);
    return decoded && decoded.type === 'csrf';
  } catch (error) {
    console.error('CSRF token verification failed:', error);
    return false;
  }
}