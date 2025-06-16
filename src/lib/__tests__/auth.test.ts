import {
  hasFeatureAccess,
  canUseProModel,
  hasTokens,
  createErrorResponse,
  createSuccessResponse,
  validateMethod,
  AuthenticatedUser
} from '../auth-client';

describe('Authentication Utilities', () => {
  describe('hasFeatureAccess', () => {
    const adminUser: AuthenticatedUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin',
      provider: 'google',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      total_tokens: 10000,
      used_tokens: 100,
      remaining_tokens: 9900
    };

    const freeUser: AuthenticatedUser = {
      id: '2',
      email: 'free@test.com',
      role: 'free',
      provider: 'google',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      total_tokens: 1000,
      used_tokens: 100,
      remaining_tokens: 900
    };

    const payUser: AuthenticatedUser = {
      id: '3',
      email: 'pay@test.com',
      role: 'pay',
      provider: 'github',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      total_tokens: 5000,
      used_tokens: 100,
      remaining_tokens: 4900
    };

    it('should allow all users to access search', () => {
      expect(hasFeatureAccess(adminUser, 'search')).toBe(true);
      expect(hasFeatureAccess(freeUser, 'search')).toBe(true);
      expect(hasFeatureAccess(payUser, 'search')).toBe(true);
    });

    it('should allow all users to access Q&A', () => {
      expect(hasFeatureAccess(adminUser, 'qa')).toBe(true);
      expect(hasFeatureAccess(freeUser, 'qa')).toBe(true);
      expect(hasFeatureAccess(payUser, 'qa')).toBe(true);
    });

    it('should only allow paid users to access consultant', () => {
      expect(hasFeatureAccess(adminUser, 'consultant')).toBe(true);
      expect(hasFeatureAccess(freeUser, 'consultant')).toBe(false);
      expect(hasFeatureAccess(payUser, 'consultant')).toBe(true);
    });

    it('should deny access to unknown features', () => {
      expect(hasFeatureAccess(adminUser, 'pro_model')).toBe(false);
    });
  });

  describe('canUseProModel', () => {
    it('should only allow VIP users to use Pro model', () => {
      const vipUser: AuthenticatedUser = {
        id: '1',
        email: 'vip@test.com',
        role: 'vip',
        provider: 'google',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        total_tokens: 10000,
        used_tokens: 100,
        remaining_tokens: 9900
      };

      const payUser: AuthenticatedUser = {
        id: '2',
        email: 'pay@test.com',
        role: 'pay',
        provider: 'github',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        total_tokens: 5000,
        used_tokens: 100,
        remaining_tokens: 4900
      };

      expect(canUseProModel(vipUser)).toBe(true);
      expect(canUseProModel(payUser)).toBe(false);
    });
  });

  describe('hasTokens', () => {
    it('should allow admin unlimited tokens', () => {
      const adminUser: AuthenticatedUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        provider: 'google',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        total_tokens: 1000,
        used_tokens: 1500,
        remaining_tokens: -500 // Over limit
      };

      expect(hasTokens(adminUser, 1000)).toBe(true);
    });

    it('should check token availability for regular users', () => {
      const user: AuthenticatedUser = {
        id: '1',
        email: 'user@test.com',
        role: 'free',
        provider: 'google',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        total_tokens: 1000,
        used_tokens: 900,
        remaining_tokens: 100
      };

      expect(hasTokens(user, 50)).toBe(true);  // 100 remaining, need 50
      expect(hasTokens(user, 150)).toBe(false); // 100 remaining, need 150
    });
  });

  describe('Response Helpers', () => {
    it('should create error response', () => {
      const response = createErrorResponse('Test error', 400);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(400);
    });

    it('should create success response', () => {
      const data = { message: 'Success' };
      const response = createSuccessResponse(data, 200);
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });

    it('should use default status codes', () => {
      const errorResponse = createErrorResponse('Error');
      const successResponse = createSuccessResponse({ data: 'test' });
      
      expect(errorResponse.status).toBe(400);
      expect(successResponse.status).toBe(200);
    });
  });

  describe('validateMethod', () => {
    it('should validate allowed methods', () => {
      const mockRequest = { method: 'POST' } as any;
      
      expect(validateMethod(mockRequest, ['POST', 'GET'])).toBe(true);
      expect(validateMethod(mockRequest, ['GET', 'PUT'])).toBe(false);
    });

    it('should be case sensitive', () => {
      const mockRequest = { method: 'post' } as any;
      
      expect(validateMethod(mockRequest, ['POST'])).toBe(false);
      expect(validateMethod(mockRequest, ['post'])).toBe(true);
    });
  });
});
