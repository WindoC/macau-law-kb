const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('Seeding database with test data...');
    
    // Create a test user for development
    console.log('Creating test user...');
    const testUser = await pool.query(`
      INSERT INTO users (email, name, avatar_url, role, provider, provider_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        provider = EXCLUDED.provider,
        provider_id = EXCLUDED.provider_id,
        updated_at = NOW()
      RETURNING id;
    `, [
      'test@example.com',
      'Test User',
      'https://via.placeholder.com/150',
      'free',
      'test',
      'test-user-123'
    ]);
    
    const userId = testUser.rows[0].id;
    console.log(`Created/updated test user with ID: ${userId}`);
    
    // Create user credits for test user
    console.log('Setting up user credits...');
    await pool.query(`
      INSERT INTO user_credits (user_id, total_tokens, used_tokens, remaining_tokens, created_at, updated_at)
      VALUES ($1, $2, 0, $2, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        total_tokens = EXCLUDED.total_tokens,
        remaining_tokens = EXCLUDED.remaining_tokens,
        updated_at = NOW();
    `, [userId, 10000]);
    
    // Create some sample search history
    console.log('Creating sample search history...');
    await pool.query(`
      INSERT INTO search_history (user_id, query, document_ids, tokens_used, created_at)
      VALUES 
        ($1, '澳門基本法', ARRAY[1, 2, 3], 150, NOW() - INTERVAL '1 day'),
        ($1, '刑法典', ARRAY[4, 5, 6], 200, NOW() - INTERVAL '2 hours'),
        ($1, '民法典', ARRAY[7, 8, 9], 180, NOW() - INTERVAL '30 minutes')
      ON CONFLICT DO NOTHING;
    `, [userId]);
    
    // Create sample QA history
    console.log('Creating sample QA history...');
    await pool.query(`
      INSERT INTO qa_history (user_id, question, answer, document_ids, tokens_used, created_at)
      VALUES 
        ($1, '什麼是澳門基本法？', '澳門基本法是澳門特別行政區的憲制性法律文件...', ARRAY[1, 2], 300, NOW() - INTERVAL '3 hours'),
        ($1, '刑法典的適用範圍是什麼？', '澳門刑法典適用於在澳門特別行政區境內實施的犯罪行為...', ARRAY[4, 5], 250, NOW() - INTERVAL '1 hour')
      ON CONFLICT DO NOTHING;
    `, [userId]);
    
    // Create sample conversation
    console.log('Creating sample conversation...');
    const conversation = await pool.query(`
      INSERT INTO consultant_conversations (user_id, title, model_used, total_tokens, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id;
    `, [userId, '法律諮詢 - 基本法問題', 'gemini-2.5-flash-preview-05-20', 500]);
    
    const conversationId = conversation.rows[0].id;
    
    // Add messages to the conversation
    await pool.query(`
      INSERT INTO consultant_messages (conversation_id, role, content, document_ids, tokens_used, created_at)
      VALUES 
        ($1, 'user', '請問澳門基本法的主要內容是什麼？', NULL, 0, NOW() - INTERVAL '10 minutes'),
        ($1, 'assistant', '澳門基本法是澳門特別行政區的憲制性法律文件，主要內容包括：\n\n1. 總則\n2. 中央和澳門特別行政區的關係\n3. 居民的基本權利和義務\n4. 政治體制\n5. 經濟\n6. 文化和社會事務\n7. 對外事務\n8. 本法的解釋和修改\n9. 附則', ARRAY[1, 2], 500, NOW() - INTERVAL '9 minutes');
    `, [conversationId]);
    
    console.log(`Created sample conversation with ID: ${conversationId}`);
    
    // Verify seeding
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE provider = 'test') as test_users,
        (SELECT COUNT(*) FROM user_credits WHERE user_id = $1) as user_credits,
        (SELECT COUNT(*) FROM search_history WHERE user_id = $1) as search_history,
        (SELECT COUNT(*) FROM qa_history WHERE user_id = $1) as qa_history,
        (SELECT COUNT(*) FROM consultant_conversations WHERE user_id = $1) as conversations,
        (SELECT COUNT(*) FROM consultant_messages WHERE conversation_id = $2) as messages;
    `, [userId, conversationId]);
    
    console.log('Seeding statistics:', stats.rows[0]);
    console.log('✅ Database seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed();
}

module.exports = { seed };