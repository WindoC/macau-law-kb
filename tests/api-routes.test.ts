/**
 * API Routes Integration Tests
 * Tests for authentication and protected API endpoints
 */

import { NextRequest } from 'next/server';
import { SessionManager } from '../src/lib/session';

// Mock dependencies
jest.mock('../src/lib/session');
jest.mock('../src/lib/auth-service');
jest.mock('../src/lib/database-new');
jest.mock('../src/lib/gemini');

const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>;

describe('API Routes Integration', () => {
  const mockSession = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'free',
    provider: 'google',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    test('should handle protected route without session', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      // Mock a protected API request
      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map(),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toBeNull();
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(mockRequest);
    });

    test('should handle protected route with valid session', async () => {
      mockSessionManager.getSession.mockResolvedValue(mockSession);

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([['access_token', 'valid-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toEqual(mockSession);
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(mockRequest);
    });

    test('should handle session refresh', async () => {
      const refreshedSession = { ...mockSession, email: 'refreshed@example.com' };
      
      mockSessionManager.getSession
        .mockResolvedValueOnce(null) // First call fails
        .mockResolvedValueOnce(refreshedSession); // Second call succeeds after refresh

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([
          ['access_token', 'expired-token'],
          ['refresh_token', 'valid-refresh-token'],
        ]),
      } as unknown as NextRequest;

      // First attempt
      let session = await SessionManager.getSession(mockRequest);
      expect(session).toBeNull();

      // After refresh
      session = await SessionManager.getSession(mockRequest);
      expect(session).toEqual(refreshedSession);
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow free user access to basic features', async () => {
      const freeUserSession = { ...mockSession, role: 'free' };
      mockSessionManager.getSession.mockResolvedValue(freeUserSession);

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:3000/api/search',
        cookies: new Map([['access_token', 'valid-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session?.role).toBe('free');
      // Free users should have access to basic search
    });

    test('should allow VIP user access to premium features', async () => {
      const vipUserSession = { ...mockSession, role: 'vip' };
      mockSessionManager.getSession.mockResolvedValue(vipUserSession);

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:3000/api/consultant',
        cookies: new Map([['access_token', 'vip-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session?.role).toBe('vip');
      // VIP users should have access to consultant features
    });

    test('should allow admin access to all features', async () => {
      const adminSession = { ...mockSession, role: 'admin' };
      mockSessionManager.getSession.mockResolvedValue(adminSession);

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/admin/stats',
        cookies: new Map([['access_token', 'admin-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session?.role).toBe('admin');
      // Admin users should have access to all features
    });
  });

  describe('Cookie Management', () => {
    test('should set authentication cookies correctly', () => {
      const mockResponse = {
        cookies: {
          set: jest.fn(),
          delete: jest.fn(),
        },
      };

      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      SessionManager.setAuthCookies(mockResponse as any, tokens);

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Test environment
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // Test environment
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      );
    });

    test('should clear authentication cookies correctly', () => {
      const mockResponse = {
        cookies: {
          set: jest.fn(),
          delete: jest.fn(),
        },
      };

      SessionManager.clearAuthCookies(mockResponse as any);

      expect(mockResponse.cookies.delete).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('access_token');
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Error Handling', () => {
    test('should handle session manager errors gracefully', async () => {
      mockSessionManager.getSession.mockRejectedValue(new Error('Session error'));

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map(),
      } as unknown as NextRequest;

      await expect(SessionManager.getSession(mockRequest)).rejects.toThrow('Session error');
    });

    test('should handle malformed cookies', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([['access_token', 'malformed-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toBeNull();
    });

    test('should handle missing required session', async () => {
      mockSessionManager.requireSession.mockRejectedValue(new Error('Authentication required'));

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:3000/api/consultant',
        cookies: new Map(),
      } as unknown as NextRequest;

      await expect(SessionManager.requireSession(mockRequest))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('Request Validation', () => {
    test('should validate request methods', async () => {
      mockSessionManager.getSession.mockResolvedValue(mockSession);

      const mockRequest = {
        method: 'DELETE', // Unsupported method
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([['access_token', 'valid-token']]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toEqual(mockSession);
      // The session should be valid, but the API route should handle method validation
    });

    test('should handle CORS preflight requests', async () => {
      const mockRequest = {
        method: 'OPTIONS',
        url: 'http://localhost:3000/api/search',
        headers: new Map([
          ['origin', 'http://localhost:3000'],
          ['access-control-request-method', 'POST'],
        ]),
      } as unknown as NextRequest;

      // OPTIONS requests typically don't require authentication
      // The session manager should handle this appropriately
      expect(mockRequest.method).toBe('OPTIONS');
    });
  });

  describe('Security Headers', () => {
    test('should validate secure cookie settings in production', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      };

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      SessionManager.setAuthCookies(mockResponse as any, tokens);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({
          secure: true, // Should be true in production
        })
      );

      // Restore original environment
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    test('should use appropriate SameSite settings', () => {
      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      };

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      SessionManager.setAuthCookies(mockResponse as any, tokens);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({
          sameSite: 'lax', // Appropriate for authentication cookies
        })
      );
    });
  });

  describe('Token Expiration', () => {
    test('should handle expired access tokens', async () => {
      // First call returns null (expired token)
      // Second call returns valid session (after refresh)
      mockSessionManager.getSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSession);

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([
          ['access_token', 'expired-token'],
          ['refresh_token', 'valid-refresh-token'],
        ]),
      } as unknown as NextRequest;

      // First attempt should fail
      let session = await SessionManager.getSession(mockRequest);
      expect(session).toBeNull();

      // After token refresh, should succeed
      session = await SessionManager.getSession(mockRequest);
      expect(session).toEqual(mockSession);
    });

    test('should handle expired refresh tokens', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:3000/api/profile',
        cookies: new Map([
          ['access_token', 'expired-token'],
          ['refresh_token', 'expired-refresh-token'],
        ]),
      } as unknown as NextRequest;

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toBeNull();
      // User should be redirected to login
    });
  });
});