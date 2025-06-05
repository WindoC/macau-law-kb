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
    console.log('Validating request method...');
    const validateMethodResult = validateMethod(request, ['POST']);
    console.log('validateMethod input:', ['POST'], 'output:', validateMethodResult);
    if (!validateMethodResult) {
      return createErrorResponse('不允許使用此方法', 405);
    }

    // Authenticate user
    console.log('Authenticating user...');
    const authResult = await authenticateRequest(request);
    console.log('authenticateRequest input:', request, 'output:', authResult);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Check feature access
    console.log('Checking feature access...');
    const hasFeatureAccessResult = hasFeatureAccess(user, 'search');
    console.log('hasFeatureAccess input:', user, 'search', 'output:', hasFeatureAccessResult);
    if (!hasFeatureAccessResult) {
      return createErrorResponse('存取遭拒', 403);
    }

    // Parse request body
    console.log('Parsing request body...');
    const body = await request.json();
    const { query } = body;
    console.log('Parsed request body:', body);

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse('查詢是必需的');
    }

    if (query.length > 1000) {
      return createErrorResponse('查詢太長 (最多 1000 個字元)');
    }

    // Estimate token usage
    console.log('Estimating token usage...');
    const estimatedTokens = countTokens(query) + 50; // Base cost for processing
    console.log('countTokens input:', query, 'output:', countTokens(query), 'estimatedTokens:', estimatedTokens);

    // Check token availability
    console.log('Checking token availability...');
    const hasTokensResult = hasTokens(user, estimatedTokens);
    console.log('hasTokens input:', user, estimatedTokens, 'output:', hasTokensResult);
    if (!hasTokensResult) {
      return createErrorResponse('代幣不足', 402);
    }

    try {
      // Step 1: Generate search keywords using AI
      console.log('Generating search keywords...');
      const keywords = await generateSearchKeywords(query);
      console.log('generateSearchKeywords input:', query, 'output:', keywords);
      
      // Step 2: Generate embedding for the keywords
      console.log('Generating embedding for the keywords...');
      const keywordsEmbedding = await generateEmbedding(keywords.join(' '));
      console.log('generateEmbedding input:', keywords.join(' '), 'output:', keywordsEmbedding);
      
      // Step 3: Search documents using vector similarity
      console.log('Searching documents...');
      const searchResults = await searchDocuments(keywordsEmbedding, 5);
      console.log('searchDocuments input:', keywordsEmbedding, 5, 'output:', searchResults);
      
      // Step 4: Calculate actual token usage
      console.log('Calculating actual token usage...');
      const actualTokens = countTokens(query) + countTokens(keywords.join(' ')) + 30;
      console.log('countTokens query input:', query, 'output:', countTokens(query));
      console.log('countTokens keywords input:', keywords.join(' '), 'output:', countTokens(keywords.join(' ')));
      console.log('actualTokens:', actualTokens);
      
      // Step 5: Update user token usage
      console.log('Updating user token usage...');
      await updateTokenUsage(user.id, actualTokens);
      console.log('updateTokenUsage input:', user.id, actualTokens);
      
      // Step 6: Save search history
      console.log('Saving search history...');
      const documentIds = searchResults.map(result => result.id);
      await saveSearchHistory(user.id, query, documentIds);
      console.log('saveSearchHistory input:', user.id, query, documentIds);
      
      // Step 7: Log API usage
      console.log('Logging API usage...');
      await logAPIUsage(user.id, 'search', actualTokens);
      console.log('logAPIUsage input:', user.id, 'search', actualTokens);

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
