// Load environment variables from .env.local and .env files
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function healthCheck() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('🔍 Running database health check...\n');
    
    // Test basic connection
    console.log('1. Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${connectionTest.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${connectionTest.rows[0].pg_version.split(' ')[0]} ${connectionTest.rows[0].pg_version.split(' ')[1]}\n`);
    
    // Check required tables exist
    console.log('2. Checking required tables...');
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_credits', 'search_history', 'qa_history', 'consultant_conversations', 'consultant_messages', 'documents')
      ORDER BY table_name;
    `);
    
    const requiredTables = ['users', 'user_credits', 'search_history', 'qa_history', 'consultant_conversations', 'consultant_messages', 'documents'];
    const existingTables = tables.rows.map(row => row.table_name);
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
      }
    });
    
    // Check migration status
    console.log('\n3. Checking migration status...');
    const userColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      AND column_name IN ('provider', 'provider_id')
      ORDER BY column_name;
    `);
    
    const migrationColumns = ['provider', 'provider_id'];
    const existingColumns = userColumns.rows.map(row => row.column_name);
    
    migrationColumns.forEach(column => {
      if (existingColumns.includes(column)) {
        console.log(`   ✅ users.${column} column exists`);
      } else {
        console.log(`   ❌ users.${column} column missing (run: npm run db:migrate)`);
      }
    });
    
    // Check indexes
    console.log('\n4. Checking performance indexes...');
    const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('users', 'search_history', 'qa_history', 'consultant_conversations', 'consultant_messages')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `);
    
    const requiredIndexes = [
      'idx_users_provider',
      'idx_search_history_user_created',
      'idx_qa_history_user_created',
      'idx_consultant_conversations_user',
      'idx_consultant_messages_conversation'
    ];
    
    const existingIndexes = indexes.rows.map(row => row.indexname);
    
    requiredIndexes.forEach(index => {
      if (existingIndexes.includes(index)) {
        console.log(`   ✅ ${index}`);
      } else {
        console.log(`   ⚠️  ${index} (missing - run: npm run db:migrate)`);
      }
    });
    
    // Check data counts
    console.log('\n5. Checking data counts...');
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM user_credits) as user_credits,
        (SELECT COUNT(*) FROM search_history) as search_history,
        (SELECT COUNT(*) FROM qa_history) as qa_history,
        (SELECT COUNT(*) FROM consultant_conversations) as conversations,
        (SELECT COUNT(*) FROM consultant_messages) as messages,
        (SELECT COUNT(*) FROM documents) as documents;
    `);
    
    const stats = counts.rows[0];
    console.log(`   Users: ${stats.users}`);
    console.log(`   User Credits: ${stats.user_credits}`);
    console.log(`   Search History: ${stats.search_history}`);
    console.log(`   QA History: ${stats.qa_history}`);
    console.log(`   Conversations: ${stats.conversations}`);
    console.log(`   Messages: ${stats.messages}`);
    console.log(`   Documents: ${stats.documents}`);
    
    // Check provider distribution
    if (existingColumns.includes('provider')) {
      console.log('\n6. Checking user provider distribution...');
      const providers = await pool.query(`
        SELECT provider, COUNT(*) as count 
        FROM users 
        WHERE provider IS NOT NULL 
        GROUP BY provider 
        ORDER BY count DESC;
      `);
      
      if (providers.rows.length > 0) {
        providers.rows.forEach(row => {
          console.log(`   ${row.provider}: ${row.count} users`);
        });
      } else {
        console.log('   No users with provider information (run: npm run db:migrate)');
      }
    }
    
    console.log('\n🎉 Health check completed successfully!');
    
    // Summary
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    const missingColumns = migrationColumns.filter(column => !existingColumns.includes(column));
    const missingIndexes = requiredIndexes.filter(index => !existingIndexes.includes(index));
    
    if (missingTables.length > 0 || missingColumns.length > 0 || missingIndexes.length > 0) {
      console.log('\n⚠️  Issues found:');
      if (missingTables.length > 0) {
        console.log(`   Missing tables: ${missingTables.join(', ')}`);
      }
      if (missingColumns.length > 0) {
        console.log(`   Missing columns: ${missingColumns.join(', ')} (run: npm run db:migrate)`);
      }
      if (missingIndexes.length > 0) {
        console.log(`   Missing indexes: ${missingIndexes.length} (run: npm run db:migrate)`);
      }
    } else {
      console.log('\n✅ All checks passed! Database is ready for the new implementation.');
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your DATABASE_URL in .env file');
    console.error('2. Ensure your database is accessible');
    console.error('3. Verify SSL settings (DB_SSL=true for Supabase)');
    console.error('4. Check database user permissions');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run health check if called directly
if (require.main === module) {
  healthCheck();
}

module.exports = { healthCheck };