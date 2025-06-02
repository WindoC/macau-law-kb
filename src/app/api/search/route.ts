import { NextRequest } from 'next/server';
import { 
  authenticateRequest, 
  hasFeatureAccess, 
  hasTokens, 
  createErrorResponse, 
  createSuccessResponse,
  validateMethod,
  logAPIUsage
} from '@/lib/auth';
import { generateEmbedding, generateSearchKeywords, countTokens } from '@/lib/gemini';
import { searchDocuments, saveSearchHistory, updateTokenUsage } from '@/lib/database';
import { supabase } from '@/lib/supabase';

/**
 * Legal Search API endpoint
 * Handles AI-powered legal document search with vector similarity
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request method
    if (!validateMethod(request, ['POST'])) {
      return createErrorResponse('不允許使用此方法', 405);
    }

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Check feature access
    if (!hasFeatureAccess(user, 'search')) {
      return createErrorResponse('存取遭拒', 403);
    }

    // Parse request body
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse('查詢是必需的');
    }

    if (query.length > 1000) {
      return createErrorResponse('查詢太長 (最多 1000 個字元)');
    }

    // Estimate token usage
    const estimatedTokens = countTokens(query) + 50; // Base cost for processing

    // Check token availability
    if (!hasTokens(user, estimatedTokens)) {
      return createErrorResponse('代幣不足', 402);
    }

    try {
      // Step 1: Generate search keywords using AI
      const keywords = await generateSearchKeywords(query);
      
      // Step 2: Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Step 3: Search documents using vector similarity
      const searchResults = await searchDocuments(queryEmbedding, 5);
      
      // Step 4: Calculate actual token usage
      const actualTokens = countTokens(query) + countTokens(keywords.join(' ')) + 30;
      
      // Step 5: Update user token usage
      await updateTokenUsage(user.id, actualTokens);
      
      // Step 6: Save search history
      const documentIds = searchResults.map(result => result.id);
      await saveSearchHistory(user.id, query, documentIds);
      
      // Step 7: Log API usage
      await logAPIUsage(user.id, 'search', actualTokens);

      // Format response
      const response = {
        query: query,
        keywords: keywords,
        results: searchResults.map(result => ({
          id: result.id,
          content: result.content,
          metadata: result.metadata,
          // link: result.metadata?.link || `#`,
          similarity: result.similarity,
          // title: result.metadata?.law_id + " - " + result.metadata?.title || `文件 #${result.id}`
        })),
        tokens_used: actualTokens,
        remaining_tokens: (user.remaining_tokens || 0) - actualTokens
      };

      return createSuccessResponse(response);

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      return createErrorResponse('AI 處理失敗', 500);
    }

  } catch (error) {
    console.error('Search API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}

/**
 * Get search history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch search history from database
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('無法獲取搜尋歷史', 500);
    }

    return createSuccessResponse({
      history: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Search history API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}
