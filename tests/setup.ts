/**
 * Test Setup Configuration
 * Sets up the testing environment for the Macau Law Knowledge Base
 */

import { jest } from '@jest/globals';

// Mock environment variables for testing
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

// Mock database configuration
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_SSL = 'false';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';

// Mock OIDC provider configuration
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/github';

// Mock Gemini API
process.env.GEMINI_API_KEY = 'test-gemini-api-key';

// Mock NextAuth configuration
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API calls
(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});