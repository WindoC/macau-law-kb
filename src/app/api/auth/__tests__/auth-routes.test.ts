/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as authInitiate } from '../[provider]/route';
import { GET as authCallback } from '../callback/[provider]/route';
import { POST as logout, GET as logoutGet } from '../logout/route';
import { authService } from '@/lib/auth-service';
import { SessionManager } from '@/lib/session';

// Mock dependencies
jest.mock('@/lib/auth-service', () => ({
  authService: {
    isInitialized: jest.fn(),
    generateAuthState: jest.fn(),
    getAuthUrl: jest.fn(),
    handleOIDCCallback: jest.fn(),
  },
}));

jest.mock('@/lib/session', () => ({
  SessionManager: {
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>;

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/[provider]', () => {
    it('should initiate Google OAuth flow', async () => {
      const mockState = 'mock-state';
      const mockNonce = 'mock-nonce';
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?...';

      mockAuthService.isInitialized.mockReturnValue(true);
      mockAuthService.generateAuthState.mockReturnValue({ state: mockState, nonce: mockNonce });
      mockAuthService.getAuthUrl.mockReturnValue(mockAuthUrl);

      const request = new NextRequest('http://localhost:3000/api/auth/google');
      const response = await authInitiate(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(mockAuthUrl);
      expect(mockAuthService.generateAuthState).toHaveBeenCalled();
      expect(mockAuthService.getAuthUrl).toHaveBeenCalledWith('google', mockState, mockNonce);
    });

    it('should initiate GitHub OAuth flow', async () => {
      const mockState = 'mock-state';
      const mockNonce = 'mock-nonce';
      const mockAuthUrl = 'https://github.com/login/oauth/authorize?...';

      mockAuthService.isInitialized.mockReturnValue(true);
      mockAuthService.generateAuthState.mockReturnValue({ state: mockState, nonce: mockNonce });
      mockAuthService.getAuthUrl.mockReturnValue(mockAuthUrl);

      const request = new NextRequest('http://localhost:3000/api/auth/github');
      const response = await authInitiate(request, { params: { provider: 'github' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(mockAuthUrl);
      expect(mockAuthService.generateAuthState).toHaveBeenCalled();
      expect(mockAuthService.getAuthUrl).toHaveBeenCalledWith('github', mockState, mockNonce);
    });

    it('should reject invalid provider', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/invalid');
      const response = await authInitiate(request, { params: { provider: 'invalid' } });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid provider. Supported providers: google, github');
    });

    it('should handle uninitialized auth service', async () => {
      mockAuthService.isInitialized.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/google');
      const response = await authInitiate(request, { params: { provider: 'google' } });

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Authentication service not initialized');
    });

    it('should handle auth service errors', async () => {
      mockAuthService.isInitialized.mockReturnValue(true);
      mockAuthService.generateAuthState.mockImplementation(() => {
        throw new Error('Auth service error');
      });

      const request = new NextRequest('http://localhost:3000/api/auth/google');
      const response = await authInitiate(request, { params: { provider: 'google' } });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Authentication initiation failed');
    });
  });

  describe('GET /api/auth/callback/[provider]', () => {
    it('should handle successful Google callback', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'free' as const,
          provider: 'google',
          name: 'Test User',
          avatar_url: undefined,
          provider_id: 'google-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockAuthService.handleOIDCCallback.mockResolvedValue(mockTokens);

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback/google?code=auth-code&state=stored-state'
      );
      
      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn((name: string) => {
            if (name === 'oauth_state') return { value: 'stored-state' };
            if (name === 'oauth_nonce') return { value: 'stored-nonce' };
            return undefined;
          }),
        },
      });

      const response = await authCallback(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/');
      expect(mockAuthService.handleOIDCCallback).toHaveBeenCalledWith(
        'google',
        'auth-code',
        'stored-state',
        'stored-nonce'
      );
      expect(mockSessionManager.setAuthCookies).toHaveBeenCalledWith(response, mockTokens);
    });

    it('should handle OAuth errors', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback/google?error=access_denied&error_description=User%20denied%20access'
      );

      const response = await authCallback(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error');
      expect(response.headers.get('location')).toContain('error=access_denied');
    });

    it('should handle missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/callback/google');

      const response = await authCallback(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=missing_parameters');
    });

    it('should handle state mismatch', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback/google?code=auth-code&state=different-state'
      );
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn((name: string) => {
            if (name === 'oauth_state') return { value: 'stored-state' };
            return undefined;
          }),
        },
      });

      const response = await authCallback(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=state_mismatch');
    });

    it('should handle OIDC callback errors', async () => {
      mockAuthService.handleOIDCCallback.mockRejectedValue(new Error('OIDC error'));

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback/google?code=auth-code&state=stored-state'
      );
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn((name: string) => {
            if (name === 'oauth_state') return { value: 'stored-state' };
            if (name === 'oauth_nonce') return { value: 'stored-nonce' };
            return undefined;
          }),
        },
      });

      const response = await authCallback(request, { params: { provider: 'google' } });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await logout(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged out successfully');
      expect(mockSessionManager.clearAuthCookies).toHaveBeenCalledWith(response);
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should logout and redirect to home', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout');

      const response = await logoutGet(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/');
      expect(mockSessionManager.clearAuthCookies).toHaveBeenCalledWith(response);
    });
  });
});