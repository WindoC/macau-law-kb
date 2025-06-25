/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, SessionData } from './session';
import { authService, User } from './auth-service';

// Mock the auth service
jest.mock('./auth-service', () => ({
  authService: {
    verifyToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('SessionManager', () => {
  let mockRequest: NextRequest;
  let mockResponse: NextResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock request
    mockRequest = {
      cookies: {
        get: jest.fn(),
      },
    } as any;

    // Create mock response with cookies API
    mockResponse = {
      cookies: {
        set: jest.fn(),
        delete: jest.fn(),
      },
    } as any;
  });

  describe('setAuthCookies', () => {
    it('should set access and refresh token cookies', () => {
      const tokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      };

      SessionManager.setAuthCookies(mockResponse, tokens);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // NODE_ENV is test
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
      );

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-456',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should delete access and refresh token cookies', () => {
      SessionManager.clearAuthCookies(mockResponse);

      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('access_token');
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('getSession', () => {
    it('should return null when no access token cookie exists', async () => {
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toBeNull();
    });

    it('should return session data when access token is valid', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'free',
        provider: 'google',
      };

      (mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: 'valid-token' });
      mockAuthService.verifyToken.mockReturnValue(mockPayload);

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toEqual(mockPayload);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should try to refresh token when access token is invalid', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'free',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockRequest.cookies.get as jest.Mock)
        .mockReturnValueOnce({ value: 'invalid-token' }) // access token
        .mockReturnValueOnce({ value: 'valid-refresh-token' }); // refresh token

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      mockAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      });

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        provider: mockUser.provider,
      });
    });

    it('should return null when both access and refresh tokens are invalid', async () => {
      (mockRequest.cookies.get as jest.Mock)
        .mockReturnValueOnce({ value: 'invalid-token' })
        .mockReturnValueOnce({ value: 'invalid-refresh-token' });

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      mockAuthService.refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

      const session = await SessionManager.getSession(mockRequest);

      expect(session).toBeNull();
    });
  });

  describe('requireSession', () => {
    it('should return session data when authenticated', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'free',
        provider: 'google',
      };

      (mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: 'valid-token' });
      mockAuthService.verifyToken.mockReturnValue(mockPayload);

      const session = await SessionManager.requireSession(mockRequest);

      expect(session).toEqual(mockPayload);
    });

    it('should throw error when not authenticated', async () => {
      (mockRequest.cookies.get as jest.Mock).mockReturnValue(undefined);

      await expect(SessionManager.requireSession(mockRequest))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('getSessionWithRefresh', () => {
    it('should return session data and not refresh when access token is valid', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'free',
        provider: 'google',
      };

      (mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: 'valid-token' });
      mockAuthService.verifyToken.mockReturnValue(mockPayload);

      const session = await SessionManager.getSessionWithRefresh(mockRequest, mockResponse);

      expect(session).toEqual(mockPayload);
      expect(mockResponse.cookies.set).not.toHaveBeenCalled();
    });

    it('should refresh tokens and set new cookies when access token is invalid', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'free',
        provider: 'google',
        provider_id: 'google-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      };

      (mockRequest.cookies.get as jest.Mock)
        .mockReturnValueOnce({ value: 'invalid-token' })
        .mockReturnValueOnce({ value: 'valid-refresh-token' });

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      mockAuthService.refreshAccessToken.mockResolvedValue(newTokens);

      const session = await SessionManager.getSessionWithRefresh(mockRequest, mockResponse);

      expect(session).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        provider: mockUser.provider,
      });

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.any(Object)
      );
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh-token',
        expect.any(Object)
      );
    });

    it('should clear cookies when refresh fails', async () => {
      (mockRequest.cookies.get as jest.Mock)
        .mockReturnValueOnce({ value: 'invalid-token' })
        .mockReturnValueOnce({ value: 'invalid-refresh-token' });

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      mockAuthService.refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

      const session = await SessionManager.getSessionWithRefresh(mockRequest, mockResponse);

      expect(session).toBeNull();
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('access_token');
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('hasRole', () => {
    const testCases = [
      { userRole: 'admin', requiredRole: 'free', expected: true },
      { userRole: 'admin', requiredRole: 'pay', expected: true },
      { userRole: 'admin', requiredRole: 'vip', expected: true },
      { userRole: 'admin', requiredRole: 'admin', expected: true },
      { userRole: 'vip', requiredRole: 'free', expected: true },
      { userRole: 'vip', requiredRole: 'pay', expected: true },
      { userRole: 'vip', requiredRole: 'vip', expected: true },
      { userRole: 'vip', requiredRole: 'admin', expected: false },
      { userRole: 'pay', requiredRole: 'free', expected: true },
      { userRole: 'pay', requiredRole: 'pay', expected: true },
      { userRole: 'pay', requiredRole: 'vip', expected: false },
      { userRole: 'free', requiredRole: 'free', expected: true },
      { userRole: 'free', requiredRole: 'pay', expected: false },
    ];

    testCases.forEach(({ userRole, requiredRole, expected }) => {
      it(`should return ${expected} when user role is ${userRole} and required role is ${requiredRole}`, () => {
        const session: SessionData = {
          userId: 'user-123',
          email: 'test@example.com',
          role: userRole,
          provider: 'google',
        };

        const result = SessionManager.hasRole(session, requiredRole);
        expect(result).toBe(expected);
      });
    });

    it('should return false for unknown roles', () => {
      const session: SessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'unknown',
        provider: 'google',
      };

      const result = SessionManager.hasRole(session, 'free');
      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const session: SessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        provider: 'google',
      };

      expect(SessionManager.isAdmin(session)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      const roles = ['free', 'pay', 'vip'];
      
      roles.forEach(role => {
        const session: SessionData = {
          userId: 'user-123',
          email: 'test@example.com',
          role,
          provider: 'google',
        };

        expect(SessionManager.isAdmin(session)).toBe(false);
      });
    });
  });
});