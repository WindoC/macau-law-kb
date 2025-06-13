import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  validateMethod,
  logAPIUsage
} from '@/lib/auth-server';
import {
  hasFeatureAccess,
  hasTokens,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/auth-client';
import { generateEmbedding, generateSearchKeywords, countTokens } from '@/lib/gemini';
import { searchDocuments, saveSearchHistory, updateTokenUsage } from '@/lib/database';

/**
 * Legal Search API endpoint
 * Handles AI-powered legal document search with vector similarity
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request method
    const validateMethodResult = validateMethod(request, ['POST']);
    if (!validateMethodResult) {
      return createErrorResponse('不允許使用此方法', 405);
    }

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Check feature access
    const hasFeatureAccessResult = hasFeatureAccess(user, 'search');
    if (!hasFeatureAccessResult) {
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
    const estimatedTokens = countTokens(query) + 1000; // Base cost for processing

    // Check token availability
    const hasTokensResult = hasTokens(user, estimatedTokens);
    console.log('hasTokens input:', user, estimatedTokens, 'output:', hasTokensResult);
    if (!hasTokensResult) {
      return createErrorResponse('代幣不足', 402);
    }

    try {
      // Step 1: Generate search keywords using AI
      console.log('Generating search keywords...');
      const keywordsResult = await generateSearchKeywords(query);
      const keywords = keywordsResult.keywords;
      console.log('generateSearchKeywords input:', query, 'output:', keywords);
      
      // Step 2: Generate embedding for the keywords
      console.log('Generating embedding for the keywords...');
      const keywordsEmbeddingResult = await generateEmbedding(keywords.join(' '));
      const keywordsEmbedding = keywordsEmbeddingResult.embedding;
      // console.log('generateEmbedding input:', keywords.join(' '), 'output:', keywordsEmbedding);
      
      // Step 3: Search documents using vector similarity
      console.log('Searching documents...');
      const searchResults = await searchDocuments(keywordsEmbedding, 5);
      // console.log('searchDocuments input:', keywordsEmbedding, 5, 'output:', searchResults);
      
      // Step 4: Calculate actual token usage
      console.log('Calculating actual token usage...');
      // const queryTokens = await countTokens(query);
      // const keywordsTokens = await countTokens(keywords.join(' '));
      // const actualTokens = queryTokens + keywordsTokens + 30;
      // console.log('countTokens query input:', query, 'output:', queryTokens);
      // console.log('countTokens keywords input:', keywords.join(' '), 'output:', keywordsTokens);
      // console.log('actualTokens:', actualTokens);
      const actualTokens = (keywordsResult.tokenCount ?? 0) + (keywordsEmbeddingResult.tokenCount ?? 0);
      
      // Step 5: Update user token usage
      console.log('Updating user token usage...');
      await updateTokenUsage(user.id, actualTokens);
      console.log('updateTokenUsage input:', user.id, actualTokens);
      
      // Step 6: Save search history
      console.log('Saving search history...');
      const documentIds = searchResults.map(result => result.id);
      await saveSearchHistory(user.id, query, documentIds, actualTokens);
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
