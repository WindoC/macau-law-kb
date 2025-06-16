/**
 * Authentication Service Tests
 * Tests for JWT token generation, OIDC handling, and user management
 */

import { authService, AuthService } from '../src/lib/auth-service';
import { oidcManager } from '../src/lib/oidc-providers';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../src/lib/db');
jest.mock('../src/lib/oidc-providers');
jest.mock('jsonwebtoken');

const mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
};

// Mock the db import
jest.doMock('../src/lib/db', () => ({
  db: mockDb,
}));

describe('Authentication Service', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'free' as const,
    provider: 'google',
    provider_id: 'google-123',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OIDC manager
    (oidcManager.initialize as jest.Mock).mockResolvedValue(undefined);
    (oidcManager.getProvider as jest.Mock).mockReturnValue({
      name: 'google',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: jest.fn((state: string, nonce?: string) => 
        `https://accounts.google.com/oauth/authorize?state=${state}&nonce=${nonce}`
      ),
    });
  });

  describe('Token Generation', () => {
    test('should generate valid JWT tokens', () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const tokens = authService.generateTokens(mockUser);

      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          provider: mockUser.provider,
        },
        'test-jwt-secret-key-for-testing-only',
        {
          expiresIn: '1h',
          issuer: 'macau-law-kb',
          audience: 'macau-law-kb-users',
        }
      );

      expect(tokens).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });
    });

    test('should use correct JWT configuration', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      authService.generateTokens(mockUser);

      const accessTokenCall = (jwt.sign as jest.Mock).mock.calls[0];
      const refreshTokenCall = (jwt.sign as jest.Mock).mock.calls[1];

      expect(accessTokenCall[2]).toEqual({
        expiresIn: '1h',
        issuer: 'macau-law-kb',
        audience: 'macau-law-kb-users',
      });

      expect(refreshTokenCall[2]).toEqual({
        expiresIn: '7d',
        issuer: 'macau-law-kb',
        audience: 'macau-law-kb-users',
      });
    });
  });

  describe('Token Verification', () => {
    test('should verify valid tokens', () => {
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        provider: mockUser.provider,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const payload = authService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-token',
        'test-jwt-secret-key-for-testing-only',
        {
          issuer: 'macau-law-kb',
          audience: 'macau-law-kb-users',
        }
      );

      expect(payload).toEqual(mockPayload);
    });

    test('should throw error for invalid tokens', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('Auth State Generation', () => {
    test('should generate random state and nonce', () => {
      const authState = authService.generateAuthState();

      expect(authState).toHaveProperty('state');
      expect(authState).toHaveProperty('nonce');
      expect(typeof authState.state).toBe('string');
      expect(typeof authState.nonce).toBe('string');
      expect(authState.state.length).toBe(32);
      expect(authState.nonce.length).toBe(32);
    });

    test('should generate unique state and nonce each time', () => {
      const authState1 = authService.generateAuthState();
      const authState2 = authService.generateAuthState();

      expect(authState1.state).not.toBe(authState2.state);
      expect(authState1.nonce).not.toBe(authState2.nonce);
    });
  });

  describe('Authorization URL Generation', () => {
    test('should generate Google auth URL with nonce', () => {
      const mockProvider = {
        authUrl: jest.fn((state: string, nonce: string) => 
          `https://accounts.google.com/oauth/authorize?state=${state}&nonce=${nonce}`
        ),
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      const authUrl = authService.getAuthUrl('google', 'test-state', 'test-nonce');

      expect(oidcManager.getProvider).toHaveBeenCalledWith('google');
      expect(mockProvider.authUrl).toHaveBeenCalledWith('test-state', 'test-nonce');
      expect(authUrl).toBe('https://accounts.google.com/oauth/authorize?state=test-state&nonce=test-nonce');
    });

    test('should generate GitHub auth URL without nonce', () => {
      const mockProvider = {
        authUrl: jest.fn((state: string) => 
          `https://github.com/login/oauth/authorize?state=${state}`
        ),
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      const authUrl = authService.getAuthUrl('github', 'test-state');

      expect(oidcManager.getProvider).toHaveBeenCalledWith('github');
      expect(mockProvider.authUrl).toHaveBeenCalledWith('test-state', '');
      expect(authUrl).toBe('https://github.com/login/oauth/authorize?state=test-state');
    });

    test('should throw error for unknown provider', () => {
      (oidcManager.getProvider as jest.Mock).mockReturnValue(undefined);

      expect(() => authService.getAuthUrl('unknown', 'test-state')).toThrow('Unknown provider: unknown');
    });
  });

  describe('OIDC Callback Handling', () => {
    beforeEach(() => {
      // Mock fetch for token exchange
      (global as any).fetch = jest.fn();
    });

    test('should handle Google OIDC callback successfully', async () => {
      const mockProvider = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      // Mock token exchange response
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock-access-token' }),
      });

      // Mock user info response
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          sub: 'google-123',
        }),
      });

      // Mock database transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [] }), // No existing user
        });
      });

      // Mock user creation
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // No existing user
            .mockResolvedValueOnce({ rows: [mockUser] }) // Create new user
            .mockResolvedValueOnce({ rows: [] }), // Create user credits
        };
        return callback(mockClient);
      });

      // Mock token generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.handleOIDCCallback('google', 'auth-code', 'test-state', 'test-nonce');

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser,
      });
    });

    test('should handle GitHub OAuth callback successfully', async () => {
      const mockProvider = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      // Mock token exchange response
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock-access-token' }),
      });

      // Mock user info response
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 123,
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        }),
      });

      // Mock database operations
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // No existing user
            .mockResolvedValueOnce({ rows: [mockUser] }) // Create new user
            .mockResolvedValueOnce({ rows: [] }), // Create user credits
        };
        return callback(mockClient);
      });

      // Mock token generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.handleOIDCCallback('github', 'auth-code', 'test-state');

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser,
      });
    });

    test('should handle existing user update', async () => {
      const existingUser = { ...mockUser, name: 'Old Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      const mockProvider = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      // Mock API responses
      (global as any).fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mock-access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            email: 'test@example.com',
            name: 'Updated Name',
            picture: 'https://example.com/avatar.jpg',
            sub: 'google-123',
          }),
        });

      // Mock database operations - existing user found and updated
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [existingUser] }) // Existing user found
            .mockResolvedValueOnce({ rows: [updatedUser] }), // Updated user
        };
        return callback(mockClient);
      });

      // Mock token generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.handleOIDCCallback('google', 'auth-code', 'test-state', 'test-nonce');

      expect(result.user.name).toBe('Updated Name');
    });

    test('should handle callback errors', async () => {
      (oidcManager.getProvider as jest.Mock).mockReturnValue(undefined);

      await expect(
        authService.handleOIDCCallback('unknown', 'auth-code', 'test-state')
      ).rejects.toThrow('Unknown provider: unknown');
    });

    test('should handle token exchange failures', async () => {
      const mockProvider = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };
      (oidcManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

      // Mock failed token exchange
      (global as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(
        authService.handleOIDCCallback('google', 'invalid-code', 'test-state', 'test-nonce')
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token successfully', async () => {
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        provider: mockUser.provider,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockDb.query.mockResolvedValue([mockUser]);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshAccessToken('valid-refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', 'test-jwt-secret-key-for-testing-only', {
        issuer: 'macau-law-kb',
        audience: 'macau-law-kb-users',
      });
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [mockUser.id]);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      });
    });

    test('should handle invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    test('should handle user not found', async () => {
      const mockPayload = { userId: 'non-existent-user' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockDb.query.mockResolvedValue([]);

      await expect(authService.refreshAccessToken('valid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('User Management', () => {
    test('should get user by ID successfully', async () => {
      mockDb.query.mockResolvedValue([mockUser]);

      const result = await authService.getUserById(mockUser.id);

      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [mockUser.id]);
      expect(result).toEqual(mockUser);
    });

    test('should return null for non-existent user', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await authService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('Initialization', () => {
    test('should check if OIDC providers are initialized', () => {
      (oidcManager.isInitialized as jest.Mock).mockReturnValue(true);

      const isInitialized = authService.isInitialized();

      expect(oidcManager.isInitialized).toHaveBeenCalled();
      expect(isInitialized).toBe(true);
    });
  });
});