import { db } from '../db';

// Mock the pg module for testing
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  mockPool.connect.mockResolvedValue(mockClient);

  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute simple query', async () => {
    // Mock the query result
    const mockResult = { rows: [{ test: 1 }], rowCount: 1 };
    (db as any).pool.query.mockResolvedValue(mockResult);

    const result = await db.query('SELECT 1 as test');
    expect(result).toHaveLength(1);
    expect(result[0].test).toBe(1);
  });

  test('should check database health', async () => {
    // Mock successful health check
    const mockResult = { rows: [{ test: 1 }], rowCount: 1 };
    (db as any).pool.query.mockResolvedValue(mockResult);

    const isHealthy = await db.healthCheck();
    expect(isHealthy).toBe(true);
  });

  test('should handle database errors gracefully', async () => {
    // Mock database error
    (db as any).pool.query.mockRejectedValue(new Error('Connection failed'));

    const isHealthy = await db.healthCheck();
    expect(isHealthy).toBe(false);
  });

  test('should handle transactions', async () => {
    // Mock transaction flow
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ test: 2 }], rowCount: 1 }) // SELECT
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    (db as any).pool.connect.mockResolvedValue(mockClient);

    const result = await db.transaction(async (client) => {
      const queryResult = await client.query('SELECT 2 as test');
      return queryResult.rows[0].test;
    });
    
    expect(result).toBe(2);
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('should provide pool status', () => {
    const status = db.getPoolStatus();
    expect(status).toHaveProperty('totalCount');
    expect(status).toHaveProperty('idleCount');
    expect(status).toHaveProperty('waitingCount');
  });
});