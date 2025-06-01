import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

/**
 * Authentication utilities for API routes
 * Handles Supabase token verification, user authentication, and role-based access control
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'free' | 'pay' | 'vip';
  monthly_tokens: number;
  used_tokens: number;
}

/**
 * Extract and verify Supabase token from request
 * @param request - Next.js request object
 * @returns Promise<AuthenticatedUser | null> - Authenticated user or null
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Get user from Supabase using the access token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user profile with role and token information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, monthly_tokens, used_tokens')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      // Create default profile if it doesn't exist
      const defaultProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
        role: 'free',
        monthly_tokens: 1000,
        used_tokens: 0,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return {
          id: user.id,
          email: user.email!,
          role: 'free',
          monthly_tokens: 1000,
          used_tokens: 0
        };
      }

      return {
        id: newProfile.id,
        email: newProfile.email!,
        role: newProfile.role,
        monthly_tokens: newProfile.monthly_tokens,
        used_tokens: newProfile.used_tokens
      };
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'free',
      monthly_tokens: profile?.monthly_tokens || 1000,
      used_tokens: profile?.used_tokens || 0
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Get current authenticated user from client-side
 * @returns Promise<User | null> - Current user or null
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get current session token for API calls
 * @returns Promise<string | null> - Session token or null
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}

/**
 * Check if user has access to a specific feature
 * @param user - Authenticated user
 * @param feature - Feature name ('search', 'qa', 'consultant')
 * @returns boolean - Whether user has access
 */
export function hasFeatureAccess(user: AuthenticatedUser, feature: string): boolean {
  switch (feature) {
    case 'search':
    case 'qa':
      // All authenticated users can access search and Q&A
      return true;
    case 'consultant':
      // Only paid users can access consultant
      return user.role !== 'free';
    default:
      return false;
  }
}

/**
 * Check if user can use Pro model (VIP only)
 * @param user - Authenticated user
 * @returns boolean - Whether user can use Pro model
 */
export function canUseProModel(user: AuthenticatedUser): boolean {
  return user.role === 'vip';
}

/**
 * Check if user has sufficient tokens
 * @param user - Authenticated user
 * @param requiredTokens - Number of tokens required
 * @returns boolean - Whether user has sufficient tokens
 */
export function hasTokens(user: AuthenticatedUser, requiredTokens: number): boolean {
  if (user.role === 'admin') {
    return true; // Admin has unlimited tokens
  }
  
  const remainingTokens = user.monthly_tokens - user.used_tokens;
  return remainingTokens >= requiredTokens;
}

/**
 * Generate CSRF token
 * @returns string - CSRF token
 */
export function generateCSRFToken(): string {
  return jwt.sign(
    { 
      type: 'csrf',
      timestamp: Date.now()
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

/**
 * Verify CSRF token
 * @param token - CSRF token to verify
 * @returns boolean - Whether token is valid
 */
export function verifyCSRFToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.type === 'csrf';
  } catch (error) {
    return false;
  }
}

/**
 * Create API response with error
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Response - Error response
 */
export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create API response with success data
 * @param data - Response data
 * @param status - HTTP status code
 * @returns Response - Success response
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Validate request method
 * @param request - Next.js request object
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns boolean - Whether method is allowed
 */
export function validateMethod(request: NextRequest, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method);
}

/**
 * Rate limiting check (simple implementation)
 * @param userId - User ID
 * @param action - Action type
 * @returns Promise<boolean> - Whether request is allowed
 */
export async function checkRateLimit(userId: string, action: string): Promise<boolean> {
  // Simple rate limiting - can be enhanced with Redis or other solutions
  const key = `rate_limit:${userId}:${action}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // Max 10 requests per minute
  
  try {
    // This is a simplified implementation
    // In production, use Redis or a proper rate limiting solution
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
}

/**
 * Log API usage for analytics
 * @param userId - User ID
 * @param action - Action performed
 * @param tokensUsed - Number of tokens used
 * @param metadata - Additional metadata
 */
export async function logAPIUsage(
  userId: string,
  action: string,
  tokensUsed: number,
  metadata: any = {}
): Promise<void> {
  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        user_id: userId,
        action: action,
        tokens_used: tokensUsed,
        metadata: metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Don't throw error as this is for analytics only
  }
}
