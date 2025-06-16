const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('Running database migrations...');
    
    // Add new columns for OIDC authentication (keeping existing structure)
    console.log('Adding OIDC columns to users table...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'oidc';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;
    `);
    
    // Create indexes for new queries
    console.log('Creating indexes for performance...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_qa_history_user_created ON qa_history(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_consultant_conversations_user ON consultant_conversations(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_consultant_messages_conversation ON consultant_messages(conversation_id, created_at ASC);
    `);
    
    // Update existing users to have provider info (one-time migration)
    console.log('Updating existing users with provider information...');
    const result = await pool.query(`
      UPDATE users SET provider = 'legacy', provider_id = id::text 
      WHERE provider IS NULL;
    `);
    console.log(`Updated ${result.rowCount} existing users with legacy provider info`);
    
    // Verify the migration
    console.log('Verifying migration...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE provider IS NOT NULL');
    console.log(`Total users with provider info: ${userCount.rows[0].count}`);
    
    const indexCheck = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('users', 'search_history', 'qa_history', 'consultant_conversations', 'consultant_messages')
      AND indexname LIKE 'idx_%'
    `);
    console.log(`Created indexes: ${indexCheck.rows.map(r => r.indexname).join(', ')}`);
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };