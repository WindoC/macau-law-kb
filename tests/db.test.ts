/**
 * Database Connection Tests
 * Tests for the PostgreSQL database connection and basic operations
 */

import { db } from '../src/lib/db';

// Mock the pg module
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(() => Promise.resolve(mockClient)),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Database Connection', () => {
  let mockPool: any;

  beforeEach(() => {
    // Get the mocked pool instance
    const { Pool } = require('pg');
    mockPool = new Pool();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Database Manager', () => {
    test('should be a singleton instance', () => {
      const db1 = require('../src/lib/db').db;
      const db2 = require('../src/lib/db').db;
      expect(db1).toBe(db2);
    });

    test('should initialize with correct configuration', () => {
      const { Pool } = require('pg');
      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });
  });

  describe('Query Operations', () => {
    test('should execute simple query successfully', async () => {
      const mockResult = {
        rows: [{ test: 1 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT 1 as test');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 as test', undefined);
      expect(result).toEqual([{ test: 1 }]);
    });

    test('should execute parameterized query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual([{ id: 1, name: 'Test User' }]);
    });

    test('should handle query errors', async () => {
      const mockError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(mockError);

      await expect(db.query('SELECT 1')).rejects.toThrow('Database connection failed');
    });

    test('should log query execution details', async () => {
      const mockResult = {
        rows: [{ test: 1 }],
        rowCount: 1,
      };
      mockPool.query.mockResolvedValue(mockResult);

      await db.query('SELECT 1 as test');

      // Verify that console.log was called (mocked in setup)
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Transaction Operations', () => {
    test('should execute transaction successfully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      // Mock transaction queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ result: 'success' }], rowCount: 1 }) // User query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await db.transaction(async (client) => {
        const queryResult = await client.query('SELECT \'success\' as result');
        return queryResult.rows[0].result;
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('SELECT \'success\' as result');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    test('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const mockError = new Error('Transaction failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(mockError) // User query fails
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      await expect(
        db.transaction(async (client) => {
          await client.query('INVALID SQL');
          return 'should not reach here';
        })
      ).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should release client even if rollback fails', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const transactionError = new Error('Transaction failed');
      const rollbackError = new Error('Rollback failed');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(transactionError) // User query fails
        .mockRejectedValueOnce(rollbackError); // ROLLBACK fails

      await expect(
        db.transaction(async (client) => {
          await client.query('INVALID SQL');
          return 'should not reach here';
        })
      ).rejects.toThrow('Transaction failed');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    test('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ test: 1 }], rowCount: 1 });

      const isHealthy = await db.healthCheck();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(isHealthy).toBe(true);
    });

    test('should return false when database is unhealthy', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await db.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Pool Management', () => {
    test('should provide pool status information', () => {
      const status = db.getPoolStatus();

      expect(status).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });

    test('should close pool connections', async () => {
      await db.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle pool connection errors', () => {
      const mockError = new Error('Pool error');
      
      // Simulate pool error event
      const errorHandler = mockPool.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      errorHandler(mockError);

      expect(console.error).toHaveBeenCalledWith('Unexpected error on idle client', mockError);
    });

    test('should log query errors with context', async () => {
      const mockError = new Error('Query failed');
      mockPool.query.mockRejectedValue(mockError);

      await expect(db.query('SELECT * FROM users', [1])).rejects.toThrow('Query failed');

      expect(console.error).toHaveBeenCalledWith('Database query error:', {
        text: 'SELECT * FROM users',
        params: [1],
        error: mockError,
      });
    });
  });
});