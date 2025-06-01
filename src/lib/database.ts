import { supabase } from './supabase';

/**
 * Database service for legal document operations
 * Handles vector search, user management, and history tracking
 */

export interface DocumentResult {
  id: number;
  content: string;
  metadata: any;
  similarity: number;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  document_ids: number[];
  created_at: string;
}

export interface QAHistory {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  document_ids: number[];
  created_at: string;
}

export interface ConversationHistory {
  id: string;
  user_id: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
}

/**
 * Search documents using vector similarity
 * @param embedding - Query embedding vector
 * @param matchCount - Number of results to return
 * @param filter - Optional metadata filter
 * @returns Promise<DocumentResult[]> - Array of matching documents
 */
export async function searchDocuments(
  embedding: number[],
  matchCount: number = 10,
  filter: Record<string, any> = {}
): Promise<DocumentResult[]> {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_count: matchCount,
      filter: filter
    });

    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Failed to search documents');
    }

    return data || [];
  } catch (error) {
    console.error('Database search error:', error);
    throw new Error('Failed to search documents');
  }
}

/**
 * Save search history
 * @param userId - User ID
 * @param query - Search query
 * @param documentIds - Array of document IDs returned
 * @returns Promise<string> - History record ID
 */
export async function saveSearchHistory(
  userId: string,
  query: string,
  documentIds: number[]
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query: query,
        document_ids: documentIds,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Save search history error:', error);
      throw new Error('Failed to save search history');
    }

    return data.id;
  } catch (error) {
    console.error('Database save search history error:', error);
    throw new Error('Failed to save search history');
  }
}

/**
 * Save Q&A history
 * @param userId - User ID
 * @param question - User question
 * @param answer - AI answer
 * @param documentIds - Array of source document IDs
 * @returns Promise<string> - History record ID
 */
export async function saveQAHistory(
  userId: string,
  question: string,
  answer: string,
  documentIds: number[]
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('qa_history')
      .insert({
        user_id: userId,
        question: question,
        answer: answer,
        document_ids: documentIds,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Save Q&A history error:', error);
      throw new Error('Failed to save Q&A history');
    }

    return data.id;
  } catch (error) {
    console.error('Database save Q&A history error:', error);
    throw new Error('Failed to save Q&A history');
  }
}

/**
 * Save or update conversation
 * @param userId - User ID
 * @param conversationId - Conversation ID (null for new conversation)
 * @param messages - Array of conversation messages
 * @param title - Conversation title
 * @returns Promise<string> - Conversation ID
 */
export async function saveConversation(
  userId: string,
  conversationId: string | null,
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>,
  title?: string
): Promise<string> {
  try {
    const now = new Date().toISOString();
    
    if (conversationId) {
      // Update existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .update({
          messages: messages,
          updated_at: now
        })
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (error) {
        console.error('Update conversation error:', error);
        throw new Error('Failed to update conversation');
      }

      return data.id;
    } else {
      // Create new conversation
      const conversationTitle = title || `對話 ${new Date().toLocaleDateString('zh-TW')}`;
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: conversationTitle,
          messages: messages,
          created_at: now,
          updated_at: now
        })
        .select('id')
        .single();

      if (error) {
        console.error('Create conversation error:', error);
        throw new Error('Failed to create conversation');
      }

      return data.id;
    }
  } catch (error) {
    console.error('Database save conversation error:', error);
    throw new Error('Failed to save conversation');
  }
}

/**
 * Get user conversations
 * @param userId - User ID
 * @param limit - Number of conversations to return
 * @returns Promise<ConversationHistory[]> - Array of conversations
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20
): Promise<ConversationHistory[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get conversations error:', error);
      throw new Error('Failed to get conversations');
    }

    return data || [];
  } catch (error) {
    console.error('Database get conversations error:', error);
    throw new Error('Failed to get conversations');
  }
}

/**
 * Get conversation by ID
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @returns Promise<ConversationHistory | null> - Conversation data
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationHistory | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Get conversation error:', error);
      throw new Error('Failed to get conversation');
    }

    return data;
  } catch (error) {
    console.error('Database get conversation error:', error);
    throw new Error('Failed to get conversation');
  }
}

/**
 * Get user profile with credits
 * @param userId - User ID
 * @returns Promise<any> - User profile data
 */
export async function getUserProfile(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get user profile error:', error);
      throw new Error('Failed to get user profile');
    }

    return data;
  } catch (error) {
    console.error('Database get user profile error:', error);
    throw new Error('Failed to get user profile');
  }
}

/**
 * Update user token usage
 * @param userId - User ID
 * @param tokensUsed - Number of tokens used
 * @returns Promise<void>
 */
export async function updateTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_tokens', {
      user_id: userId,
      tokens_used: tokensUsed
    });

    if (error) {
      console.error('Update token usage error:', error);
      throw new Error('Failed to update token usage');
    }
  } catch (error) {
    console.error('Database update token usage error:', error);
    throw new Error('Failed to update token usage');
  }
}

/**
 * Check if user has sufficient tokens
 * @param userId - User ID
 * @param requiredTokens - Number of tokens required
 * @returns Promise<boolean> - Whether user has sufficient tokens
 */
export async function checkTokenAvailability(
  userId: string,
  requiredTokens: number
): Promise<boolean> {
  try {
    const profile = await getUserProfile(userId);
    const remainingTokens = profile.monthly_tokens - profile.used_tokens;
    return remainingTokens >= requiredTokens;
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
    const { data, error } = await supabase
      .from('law')
      .select('*')
      .eq('id', lawId)
      .single();

    if (error) {
      console.error('Get law document error:', error);
      throw new Error('Failed to get law document');
    }

    return data;
  } catch (error) {
    console.error('Database get law document error:', error);
    throw new Error('Failed to get law document');
  }
}
