/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET as getProfile, PATCH as updateProfile } from '../route';
import { SessionManager } from '@/lib/session';
import { getUserProfile } from '@/lib/database-new';
import { db } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/session', () => ({
  SessionManager: {
    requireSession: jest.fn(),
  },
}));

jest.mock('@/lib/database-new', () => ({
  getUserProfile: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  db: {
    query: jest.fn(),
  },
}));

const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockDb = db as jest.Mocked<typeof db>;

describe('Profile API Routes', () => {
  const mockSession = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'free',
    provider: 'google',
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'free',
    provider: 'google',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z',
    total_tokens: 1000,
    used_tokens: 250,
    remaining_tokens: 750,
    last_reset: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile successfully', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockGetUserProfile.mockResolvedValue(mockProfile);

      const request = new NextRequest('http://localhost:3000/api/profile');
      const response = await getProfile(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toEqual({
        id: mockProfile.id,
        email: mockProfile.email,
        name: mockProfile.name,
        avatar_url: mockProfile.avatar_url,
        role: mockProfile.role,
        provider: mockProfile.provider,
        created_at: mockProfile.created_at,
        updated_at: mockProfile.updated_at,
        credits: {
          total_tokens: mockProfile.total_tokens,
          used_tokens: mockProfile.used_tokens,
          remaining_tokens: mockProfile.remaining_tokens,
          last_reset: mockProfile.last_reset,
        }
      });

      expect(mockSessionManager.requireSession).toHaveBeenCalledWith(request);
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockSession);
    });

    it('should handle authentication required error', async () => {
      mockSessionManager.requireSession.mockRejectedValue(new Error('Authentication required'));

      const request = new NextRequest('http://localhost:3000/api/profile');
      const response = await getProfile(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should handle profile fetch errors', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockGetUserProfile.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/profile');
      const response = await getProfile(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to get profile');
    });

    it('should handle missing credits gracefully', async () => {
      const profileWithoutCredits = {
        ...mockProfile,
        total_tokens: null,
        used_tokens: null,
        remaining_tokens: null,
        last_reset: null,
      };

      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockGetUserProfile.mockResolvedValue(profileWithoutCredits);

      const request = new NextRequest('http://localhost:3000/api/profile');
      const response = await getProfile(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.credits).toEqual({
        total_tokens: 0,
        used_tokens: 0,
        remaining_tokens: 0,
        last_reset: null,
      });
    });
  });

  describe('PATCH /api/profile', () => {
    it('should update user name successfully', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'free',
        provider: 'google',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      };

      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockDb.query.mockResolvedValue([updatedUser]);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar_url: updatedUser.avatar_url,
        role: updatedUser.role,
        provider: updatedUser.provider,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET name = $2'),
        ['user-123', 'Updated Name']
      );
    });

    it('should reject invalid fields', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'new@example.com', role: 'admin' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('No valid fields to update');
    });

    it('should handle empty update request', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('No valid fields to update');
    });

    it('should handle user not found', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockDb.query.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });

    it('should handle authentication required error', async () => {
      mockSessionManager.requireSession.mockRejectedValue(new Error('Authentication required'));

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      mockSessionManager.requireSession.mockResolvedValue(mockSession);
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProfile(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to update profile');
    });
  });
});