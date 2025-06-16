import { NextRequest, NextResponse } from 'next/server';
import { authService } from './auth-service';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  provider: string;
}

export class SessionManager {
  /**
   * Set authentication cookies in the response
   * @param response - NextResponse object
   * @param tokens - Access and refresh tokens
   */
  static setAuthCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
  
  /**
   * Clear authentication cookies from the response
   * @param response - NextResponse object
   */
  static clearAuthCookies(response: NextResponse) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }
  
  /**
   * Get session data from request cookies
   * @param request - NextRequest object
   * @returns SessionData or null if not authenticated
   */
  static async getSession(request: NextRequest): Promise<SessionData | null> {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    
    if (!accessToken) {
      return null;
    }
    
    try {
      const payload = authService.verifyToken(accessToken);
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        provider: payload.provider,
      };
    } catch (error) {
      // Try to refresh token if access token is invalid
      const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      if (refreshToken) {
        try {
          const newTokens = await authService.refreshAccessToken(refreshToken);
          return {
            userId: newTokens.user.id,
            email: newTokens.user.email,
            role: newTokens.user.role,
            provider: newTokens.user.provider,
          };
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      return null;
    }
  }
  
  /**
   * Require valid session or throw error
   * @param request - NextRequest object
   * @returns SessionData
   * @throws Error if not authenticated
   */
  static async requireSession(request: NextRequest): Promise<SessionData> {
    const session = await this.getSession(request);
    if (!session) {
      throw new Error('Authentication required');
    }
    return session;
  }
  
  /**
   * Get session data with automatic token refresh
   * @param request - NextRequest object
   * @param response - NextResponse object (for setting new cookies)
   * @returns SessionData or null
   */
  static async getSessionWithRefresh(
    request: NextRequest, 
    response: NextResponse
  ): Promise<SessionData | null> {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    
    if (!accessToken) {
      return null;
    }
    
    try {
      const payload = authService.verifyToken(accessToken);
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        provider: payload.provider,
      };
    } catch (error) {
      // Try to refresh token
      const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      if (refreshToken) {
        try {
          const newTokens = await authService.refreshAccessToken(refreshToken);
          
          // Set new cookies in response
          this.setAuthCookies(response, newTokens);
          
          return {
            userId: newTokens.user.id,
            email: newTokens.user.email,
            role: newTokens.user.role,
            provider: newTokens.user.provider,
          };
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear invalid cookies
          this.clearAuthCookies(response);
        }
      }
      
      return null;
    }
  }
  
  /**
   * Check if user has specific role
   * @param session - SessionData
   * @param requiredRole - Required role
   * @returns Boolean indicating if user has required role
   */
  static hasRole(session: SessionData, requiredRole: string): boolean {
    const roleHierarchy = {
      'admin': 4,
      'vip': 3,
      'pay': 2,
      'free': 1
    };
    
    const userRoleLevel = roleHierarchy[session.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  }
  
  /**
   * Check if user is admin
   * @param session - SessionData
   * @returns Boolean indicating if user is admin
   */
  static isAdmin(session: SessionData): boolean {
    return session.role === 'admin';
  }
}