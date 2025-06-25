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
  provider: string;
  created_at: string;
  updated_at: string;
  credits: {
    total_tokens: number;
    used_tokens: number;
    remaining_tokens: number;
    last_reset: string;
  }
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
 * Get current user from client-side (for use in React components)
 * This function should be used in client components to get the current user
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export function hasCredits(user: AuthenticatedUser, requiredCredits: number): boolean {
  // Admin users have unlimited tokens
  if (user.role === 'admin') return true;
  
  return (user.credits.remaining_tokens || 0) >= requiredCredits;
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

/**
 * Check if user is authenticated by making a request to the profile endpoint
 */
export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false; // Server-side, return false
  }

  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Logout user by calling the logout endpoint
 */
export async function logout(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
}