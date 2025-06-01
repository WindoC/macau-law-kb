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
      return createErrorResponse('Method not allowed', 405);
    }

    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Check feature access
    if (!hasFeatureAccess(user, 'search')) {
      return createErrorResponse('Access denied', 403);
    }

    // Parse request body
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse('Query is required');
    }

    if (query.length > 1000) {
      return createErrorResponse('Query too long (max 1000 characters)');
    }

    // Estimate token usage
    const estimatedTokens = countTokens(query) + 50; // Base cost for processing

    // Check token availability
    if (!hasTokens(user, estimatedTokens)) {
      return createErrorResponse('Insufficient tokens', 402);
    }

    try {
      // Step 1: Generate search keywords using AI
      const keywords = await generateSearchKeywords(query);
      
      // Step 2: Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Step 3: Search documents using vector similarity
      const searchResults = await searchDocuments(queryEmbedding, 10);
      
      // Step 4: Calculate actual token usage
      const actualTokens = countTokens(query) + countTokens(keywords.join(' ')) + 30;
      
      // Step 5: Update user token usage
      await updateTokenUsage(user.id, actualTokens);
      
      // Step 6: Save search history
      const documentIds = searchResults.map(result => result.id);
      await saveSearchHistory(user.id, query, documentIds);
      
      // Step 7: Log API usage
      await logAPIUsage(user.id, 'search', actualTokens, {
        query_length: query.length,
        results_count: searchResults.length,
        keywords: keywords
      });

      // Format response
      const response = {
        query: query,
        keywords: keywords,
        results: searchResults.map(result => ({
          id: result.id,
          content: result.content,
          metadata: result.metadata,
          similarity: result.similarity,
          title: result.metadata?.title || `文件 #${result.id}`
        })),
        tokens_used: actualTokens,
        remaining_tokens: user.monthly_tokens - user.used_tokens - actualTokens
      };

      return createSuccessResponse(response);

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      return createErrorResponse('AI processing failed', 500);
    }

  } catch (error) {
    console.error('Search API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Get search history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

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
      return createErrorResponse('Failed to fetch search history', 500);
    }

    return createSuccessResponse({
      history: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Search history API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
