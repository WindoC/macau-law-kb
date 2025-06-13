/**
 * Client-side authentication utilities
 * These functions are safe to use in React components and client-side code
 */

/**
 * User role types for the application (matching database schema)
 */
export type UserRole = 'admin' | 'free' | 'pay' | 'vip';

/**
 * User data structure returned by authentication (matching database schema)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  // Credits info from user_credits table
  total_tokens?: number;
  used_tokens?: number;
  remaining_tokens?: number;
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
    const session = localStorage.getItem(process.env.NEXT_PUBLIC_LOCALSTORAGE_ID || 'localstorage-auth-token');
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    return parsed?.access_token || null;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}

/**
 * Get current user from client-side (for use in React components)
 * This function should be used in client components to get the current user
 */
export async function getCurrentUser(): Promise<any | null> {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  try {
    // Get the session from localStorage where Supabase stores it
    const session = localStorage.getItem(process.env.NEXT_PUBLIC_LOCALSTORAGE_ID || 'localstorage-auth-token');
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    const user = parsed?.user;
    
    if (!user) return null;
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export function hasCredits(user: AuthenticatedUser, requiredCredits: number): boolean {
  return (user.remaining_tokens || 0) >= requiredCredits;
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
      return user.role !== 'free'; // Only paid users can access consultant
    
    case 'pro_model':
      return user.role === 'vip'; // Only VIP users can use pro model
    
    default:
      return false;
  }
}

/**
 * Check if user has sufficient tokens (alias for hasCredits)
 */
export function hasTokens(user: AuthenticatedUser, requiredTokens: number): boolean {
  return hasCredits(user, requiredTokens);
}

/**
 * Check if user can use the pro model
 */
export function canUseProModel(user: AuthenticatedUser): boolean {
  return hasFeatureAccess(user, 'pro_model');
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, status: number = 400) {
  return Response.json({
    success: false,
    error: message
  }, { status });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return Response.json({
    success: true,
    ...data
  }, { status });
}

/**
 * Validate HTTP method for API routes
 */
export function validateMethod(request: { method: string }, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method);
}