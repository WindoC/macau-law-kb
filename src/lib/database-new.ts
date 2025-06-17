import { db } from './db';

/**
 * Database service for legal document operations using direct PostgreSQL
 * Handles vector search, user management, history tracking, and conversation management
 */

export interface DocumentResult {
  id: number;
  content: string;
  metadata: any;
  similarity: number;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  provider: string;
}

/**
 * Search documents using vector similarity via PostgreSQL function
 * @param session - User session data
 * @param embedding - Query embedding vector
 * @param matchCount - Number of results to return
 * @param filter - Optional metadata filter
 * @returns Promise<DocumentResult[]> - Array of matching documents
 */
export async function searchDocuments(
  // session: SessionData,
  embedding: number[],
  matchCount: number = 10,
  filter: Record<string, any> = {}
): Promise<DocumentResult[]> {
  try {
    const results = await db.query<DocumentResult>(
      'SELECT * FROM match_documents($1, $2, $3)',
      [`[${embedding.join(',')}]`, matchCount, filter]
    );
    
    return results;
  } catch (error) {
    console.error('Vector search error:', error);
    throw new Error('Failed to search documents');
  }
}

/**
 * Save search history
 * @param session - User session data
 * @param query - Search query
 * @param documentIds - Array of document IDs returned
 * @param tokensUsed - Number of tokens used
 * @returns Promise<string> - History record ID
 */
export async function saveSearchHistory(
  session: SessionData,
  query: string,
  documentIds: number[],
  tokensUsed: number
): Promise<string> {
  try {
    const [result] = await db.query<{ id: string }>(
      `INSERT INTO search_history (user_id, query, document_ids, tokens_used, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [session.userId, query, documentIds, tokensUsed]
    );
    
    return result.id;
  } catch (error) {
    console.error('Save search history error:', error);
    throw new Error('Failed to save search history');
  }
}

/**
 * Save Q&A history
 * @param session - User session data
 * @param question - User question
 * @param answer - AI answer
 * @param documentIds - Array of source document IDs
 * @param tokensUsed - Number of tokens used
 * @returns Promise<string> - History record ID
 */
export async function saveQAHistory(
  session: SessionData,
  question: string,
  answer: string,
  documentIds: number[],
  tokensUsed: number
): Promise<string> {
  try {
    const [result] = await db.query<{ id: string }>(
      `INSERT INTO qa_history (user_id, question, answer, document_ids, tokens_used, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [session.userId, question, answer, documentIds, tokensUsed]
    );
    
    return result.id;
  } catch (error) {
    console.error('Save Q&A history error:', error);
    throw new Error('Failed to save Q&A history');
  }
}

// /**
//  * Save conversation messages to the database
//  * @param conversationId - Conversation ID to link messages to
//  * @param messages - Array of messages to save
//  * @returns Promise<void>
//  */
// export async function saveConversationMessages(
//   conversationId: string,
//   messages: Array<{ 
//     role: 'user' | 'assistant'; 
//     content: string; 
//     documents_ids?: number[]; 
//     tokens_used?: number; 
//     timestamp: string 
//   }>
// ): Promise<void> {
//   try {
//     if (!messages || messages.length === 0) return;
    
//     const messagesToInsert = messages.slice(-2).map((message) => [
//       conversationId,
//       message.role,
//       message.content,
//       message.documents_ids || null,
//       message.tokens_used || 0,
//       message.timestamp
//     ]);
    
//     const placeholders = messagesToInsert.map((_, i) => 
//       `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
//     ).join(', ');
    
//     await db.query(
//       `INSERT INTO consultant_messages (conversation_id, role, content, document_ids, tokens_used, created_at)
//        VALUES ${placeholders}`,
//       messagesToInsert.flat()
//     );
//   } catch (error) {
//     console.error('Save conversation messages error:', error);
//     throw new Error('Failed to save conversation messages');
//   }
// }

/**
 * Save or update conversation with messages
 * @param session - User session data
 * @param conversationId - Conversation ID (null for new conversation)
 * @param messages - Array of conversation messages
 * @param title - Conversation title
 * @param totalTokens - Total tokens used in conversation
 * @param modelUsed - Model used for the conversation
 * @returns Promise<string> - Conversation ID
 */
export async function saveConversation(
  session: SessionData,
  conversationId: string | null,
  messages: Array<{ 
    role: 'user' | 'assistant'; 
    content: string; 
    documents_ids?: number[]; 
    tokens_used?: number; 
    timestamp: string 
  }>,
  title?: string,
  totalTokens?: number,
  modelUsed?: string
): Promise<string> {
  return db.transaction(async (client) => {
    let finalConversationId: string;
    
    if (conversationId) {
      // Update existing conversation
      const updateResult = await client.query<{ id: string }>(
        `UPDATE consultant_conversations
         SET updated_at = NOW(),
             total_tokens = COALESCE($1, total_tokens),
             model_used = COALESCE($2, model_used)
         WHERE id = $3 AND user_id = $4
         RETURNING id`,
        [totalTokens, modelUsed, conversationId, session.userId]
      );
      
      if (!updateResult.rows[0]) {
        throw new Error('Conversation not found or access denied');
      }
      
      finalConversationId = updateResult.rows[0].id;
    } else {
      // Create new conversation
      const conversationTitle = title || `對話 ${new Date().toLocaleDateString('zh-TW')}`;
      
      const createResult = await client.query<{ id: string }>(
        `INSERT INTO consultant_conversations (user_id, title, model_used, total_tokens, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [session.userId, conversationTitle, modelUsed || 'gemini-2.5-flash-preview-05-20', totalTokens || 0]
      );
      
      finalConversationId = createResult.rows[0].id;
    }
    
    // Save messages
    if (messages && messages.length > 0) {
      const messagesToInsert = messages.slice(-2).map((message) => [
        finalConversationId,
        message.role,
        message.content,
        message.documents_ids || null,
        message.tokens_used || 0,
        message.timestamp
      ]);
      
      const placeholders = messagesToInsert.map((_, i) => 
        `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
      ).join(', ');
      
      await client.query(
        `INSERT INTO consultant_messages (conversation_id, role, content, document_ids, tokens_used, created_at)
        VALUES ${placeholders}`,
        messagesToInsert.flat()
      );
    }
    
    return finalConversationId;
  });
}

/**
 * Get user profile with credits
 * @param session - User session data
 * @returns Promise<any> - User profile data
 */
export async function getUserProfile(session: SessionData): Promise<any> {
  try {
    // console.log('Getting user profile for:', session.userId);
    
    // Try database first
    const users = await db.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.provider, u.created_at, u.updated_at,
              uc.total_tokens, uc.used_tokens, uc.remaining_tokens, uc.last_reset
       FROM users u
       LEFT JOIN user_credits uc ON u.id = uc.user_id
       WHERE u.id = $1`,
      [session.userId]
    );
    
    if (users.length > 0) {
      // console.log('Successfully retrieved user profile from database:', users[0].email);
      return users[0];
    }
    
    // // If user not found in database, check if it's a temporary user
    // if (session.userId.startsWith('temp-')) {
    //   console.log('User not in database, returning temporary profile for:', session.userId);
    //   return {
    //     id: session.userId,
    //     email: session.email,
    //     name: 'Temporary User',
    //     avatar_url: null,
    //     role: session.role,
    //     provider: session.provider,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     total_tokens: 100000,
    //     used_tokens: 0,
    //     remaining_tokens: 100000,
    //     last_reset: new Date()
    //   };
    // }
    
    throw new Error('User not found');
  } catch (error) {
    console.error('Get user profile error:', error);
    
    // // If it's a temporary user and database failed, return mock profile
    // if (session.userId.startsWith('temp-')) {
    //   console.log('Database error for temp user, returning mock profile');
    //   return {
    //     id: session.userId,
    //     email: session.email,
    //     name: 'Temporary User',
    //     avatar_url: null,
    //     role: session.role,
    //     provider: session.provider,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     total_tokens: 100000,
    //     used_tokens: 0,
    //     remaining_tokens: 100000,
    //     last_reset: new Date()
    //   };
    // }
    
    throw new Error('Failed to get user profile');
  }
}

/**
 * Update user token usage
 * @param session - User session data
 * @param tokensUsed - Number of tokens used
 * @returns Promise<void>
 */
export async function updateTokenUsage(
  session: SessionData,
  feature: 'search' | 'qa' | 'consultant',
  tokensUsed: number
): Promise<number> {
  return db.transaction(async (client) => {
    let remaining_tokens: number;
  
    const updateResult = await client.query<{ remaining_tokens: number }>(
      `UPDATE user_credits 
       SET used_tokens = used_tokens + $1,
           remaining_tokens = remaining_tokens - $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING remaining_tokens`,
      [tokensUsed, session.userId]
    );

    if (!updateResult.rows.length) {
      throw new Error('User credits not found');
    }

    remaining_tokens = updateResult.rows[0]?.remaining_tokens;

    console.log(`User ${session.userId} used ${tokensUsed} tokens for ${feature}. Remaining tokens: ${remaining_tokens}`);
    const insertResult = await client.query<{ id: string }>(
      `INSERT INTO token_usage
       (user_id, feature_type, tokens_used, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [session.userId, feature, tokensUsed]
    );
    
    return remaining_tokens;
  });
}

/**
 * Check if user has sufficient tokens
 * @param session - User session data
 * @param requiredTokens - Number of tokens required
 * @returns Promise<boolean> - Whether user has sufficient tokens
 */
export async function checkTokenAvailability(
  session: SessionData,
  requiredTokens: number
): Promise<boolean> {
  try {
    const [result] = await db.query<{ remaining_tokens: number }>(
      'SELECT remaining_tokens FROM user_credits WHERE user_id = $1',
      [session.userId]
    );
    
    return result ? result.remaining_tokens >= requiredTokens : false;
  } catch (error) {
    console.error('Check token availability error:', error);
    return false;
  }
}

/**
 * Get law document by ID
 * @param lawId - Law document ID
 * @returns Promise<any> - Law document data
 */
export async function getLawDocument(lawId: string): Promise<any> {
  try {
    const [document] = await db.query(
      'SELECT * FROM law WHERE id = $1',
      [lawId]
    );
    
    if (!document) {
      throw new Error('Law document not found');
    }
    
    return document;
  } catch (error) {
    console.error('Get law document error:', error);
    throw new Error('Failed to get law document');
  }
}