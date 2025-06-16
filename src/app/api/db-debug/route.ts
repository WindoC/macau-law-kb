import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { db } from '../../../lib/db';

// Create a dedicated debug pool
const debugPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // max: 10, // Reduced pool size for better connection management
    // idleTimeoutMillis: 30000,
    // connectionTimeoutMillis: 5000, // Increased timeout
    // // Additional options for better connection stability
    // keepAlive: true,
    // keepAliveInitialDelayMillis: 10000,
});

interface DebugResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const { operation, query, params } = await request.json();
  const startTime = Date.now();
  
  const result: DebugResult = {
    operation,
    success: false,
    timestamp: new Date().toISOString(),
  };

  try {
    let client;
    
    switch (operation) {
      case 'connection_test':
        client = await debugPool.connect();
        const connectionResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
        result.data = connectionResult.rows[0];
        result.success = true;
        client.release();
        break;

      case 'pool_status':
        result.data = {
          totalCount: debugPool.totalCount,
          idleCount: debugPool.idleCount,
          waitingCount: debugPool.waitingCount,
        };
        result.success = true;
        break;

      case 'simple_query':
        client = await debugPool.connect();
        const simpleResult = await client.query(query || 'SELECT 1 as test');
        result.data = simpleResult.rows;
        result.success = true;
        client.release();
        break;

      case 'users_select':
        client = await debugPool.connect();
        const usersResult = await client.query('SELECT id, email, name, role, provider, created_at FROM users LIMIT 10');
        result.data = usersResult.rows;
        result.success = true;
        client.release();
        break;

      case 'users_count':
        client = await debugPool.connect();
        const countResult = await client.query('SELECT COUNT(*) as total FROM users');
        result.data = countResult.rows[0];
        result.success = true;
        client.release();
        break;

      case 'users_insert_test':
        client = await debugPool.connect();
        const testEmail = `test-${Date.now()}@debug.com`;
        const insertResult = await client.query(
          'INSERT INTO users (email, name, role, provider, provider_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
          [testEmail, 'Debug User', 'free', 'debug', `debug-${Date.now()}`]
        );
        result.data = insertResult.rows[0];
        result.success = true;
        client.release();
        break;

      case 'users_update_test':
        client = await debugPool.connect();
        // First, get a user to update
        const userToUpdate = await client.query('SELECT id FROM users WHERE provider = $1 LIMIT 1', ['debug']);
        if (userToUpdate.rows.length > 0) {
          const updateResult = await client.query(
            'UPDATE users SET updated_at = NOW() WHERE id = $1 RETURNING id, updated_at',
            [userToUpdate.rows[0].id]
          );
          result.data = updateResult.rows[0];
        } else {
          result.data = { message: 'No debug users found to update' };
        }
        result.success = true;
        client.release();
        break;

      case 'transaction_test':
        client = await debugPool.connect();
        try {
          await client.query('BEGIN');
          const transactionResult = await client.query('SELECT COUNT(*) as count FROM users');
          await client.query('COMMIT');
          result.data = transactionResult.rows[0];
          result.success = true;
        } catch (transactionError) {
          await client.query('ROLLBACK');
          throw transactionError;
        } finally {
          client.release();
        }
        break;

      case 'auth_flow_simulation':
        client = await debugPool.connect();
        try {
          // Simulate the exact auth flow that was failing
          const testEmail = `auth-test-${Date.now()}@debug.com`;
          const testProviderId = `auth-${Date.now()}`;
          
          // Step 1: Check if user exists
          const existingUser = await client.query(
            'SELECT * FROM users WHERE provider_id = $1 AND provider = $2',
            [testProviderId, 'debug']
          );
          
          let userData;
          if (existingUser.rows.length === 0) {
            // Step 2: Create new user
            const newUser = await client.query(
              'INSERT INTO users (email, name, role, provider, provider_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
              [testEmail, 'Auth Test User', 'free', 'debug', testProviderId]
            );
            userData = newUser.rows[0];
          } else {
            // Step 3: Update existing user
            const updatedUser = await client.query(
              'UPDATE users SET updated_at = NOW(), name = $1 WHERE id = $2 RETURNING *',
              ['Updated Auth Test User', existingUser.rows[0].id]
            );
            userData = updatedUser.rows[0];
          }
          
          // Step 4: Check/create user credits
          const existingCredits = await client.query(
            'SELECT * FROM user_credits WHERE user_id = $1',
            [userData.id]
          );
          
          if (existingCredits.rows.length === 0) {
            await client.query(
              'INSERT INTO user_credits (user_id, total_tokens, used_tokens, remaining_tokens) VALUES ($1, $2, $3, $4)',
              [userData.id, 100000, 0, 100000]
            );
          }
          
          result.data = {
            user: userData,
            credits_existed: existingCredits.rows.length > 0,
            flow_completed: true
          };
          result.success = true;
        } finally {
          client.release();
        }
        break;

      case 'cleanup_debug_users':
        client = await debugPool.connect();
        const deleteResult = await client.query('DELETE FROM users WHERE provider = $1', ['debug']);
        result.data = { deleted_count: deleteResult.rowCount };
        result.success = true;
        client.release();
        break;

      case 'custom_query':
        if (!query) {
          throw new Error('Query is required for custom_query operation');
        }
        client = await debugPool.connect();
        const customResult = await client.query(query, params || []);
        result.data = {
          rows: customResult.rows,
          rowCount: customResult.rowCount,
          command: customResult.command
        };
        result.success = true;
        client.release();
        break;

      case 'check_user_table':
        client = await debugPool.connect();
        const tableInfo = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        result.data = tableInfo.rows;
        result.success = true;
        client.release();
        break;

      case 'check_recent_users':
        client = await debugPool.connect();
        const recentUsers = await client.query(`
          SELECT id, email, name, provider, provider_id, created_at 
          FROM users 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        result.data = recentUsers.rows;
        result.success = true;
        client.release();
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    result.duration = Date.now() - startTime;
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    result.duration = Date.now() - startTime;
    
    // Log the full error for debugging
    console.error(`Database debug operation '${operation}' failed:`, error);
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Debug API',
    available_operations: [
      'connection_test',
      'pool_status', 
      'simple_query',
      'users_select',
      'users_count',
      'users_insert_test',
      'users_update_test',
      'transaction_test',
      'auth_flow_simulation',
      'cleanup_debug_users',
      'custom_query',
      'check_user_table',
      'check_recent_users'
    ]
  });
}