import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | object;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

class DatabaseManager {
  private pool: Pool;
  private static instance: DatabaseManager;
  
  constructor() {
    // Use DATABASE_URL if available, otherwise fall back to individual variables
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false,
        max: 10, // Reduced pool size for better connection management
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Increased timeout
        // Additional options for better connection stability
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });
    } else {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
      
      this.pool = new Pool(config);
    }
    
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  /**
   * Execute a SQL query with optional parameters
   * @param text - SQL query string
   * @param params - Optional query parameters
   * @returns Promise resolving to query results
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    try {
      const result: QueryResult<T> = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount
      });
      return result.rows;
    } catch (error) {
      console.error('Database query error:', { text, params, error });
      throw error;
    }
  }
  
  /**
   * Execute multiple queries within a transaction
   * @param callback - Function containing transaction logic
   * @returns Promise resolving to callback result
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
  
  /**
   * Check if database connection is healthy
   * @returns Promise resolving to boolean indicating health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get current pool status for monitoring
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export const db = DatabaseManager.getInstance();