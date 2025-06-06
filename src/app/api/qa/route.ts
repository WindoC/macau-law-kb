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
import { generateEmbedding, generateSearchKeywords, generateLegalAnswer, countTokens } from '@/lib/gemini';
import { searchDocuments, saveQAHistory, updateTokenUsage } from '@/lib/database';
import { supabase } from '@/lib/supabase';

/**
 * Legal Q&A API endpoint
 * Handles AI-powered legal question answering with context from vector search
 */
export async function POST(request: NextRequest) {
  console.log('POST request received at /api/qa'); // Added debug log
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
    const hasFeatureAccessResult = hasFeatureAccess(user, 'qa');
    if (!hasFeatureAccessResult) {
      return createErrorResponse('存取遭拒', 403);
    }

    // Parse request body
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return createErrorResponse('問題是必需的');
    }

    if (question.length > 2000) {
      return createErrorResponse('問題太長 (最多 2000 個字元)');
    }

    // Estimate token usage
    const estimatedTokens = countTokens(question) + 10000; // Higher cost for Q&A

    // Check token availability
    const hasTokensResult = hasTokens(user, estimatedTokens);
    console.log('hasTokens input:', user, estimatedTokens, 'output:', hasTokensResult);
    if (!hasTokensResult) {
      return createErrorResponse('代幣不足', 402);
    }

    try {
      // Step 1: Generate search keywords using AI
      console.log('Generating search keywords...');
      const keywordsResult = await generateSearchKeywords(question);
      const keywords = keywordsResult.keywords;
      console.log('generateSearchKeywords input:', question, 'output:', keywords);
      
      // Step 2: Generate embedding for the keywords
      console.log('Generating embedding for the keywords...');
      const keywordsEmbeddingResult = await generateEmbedding(keywords.join(' '));
      const keywordsEmbedding = keywordsEmbeddingResult.embedding;
      console.log('generateEmbedding input:', keywords.join(' '), 'output:', keywordsEmbedding);
      
      // Step 3: Search documents using vector similarity
      console.log('Searching documents...');
      const searchResults = await searchDocuments(keywordsEmbedding, 20);
      console.log('searchDocuments input:', keywordsEmbedding, 20, 'output:', searchResults);
      
      if (searchResults.length === 0) {
        return createErrorResponse('找不到與您的問題相關的法律文件');
      }

      // Step 4: Generate AI answer based on search results
      console.log('Generating AI answer...');
      const answerResult = await generateLegalAnswer(question, searchResults);
      const answer = answerResult.answer;
      console.log('generateLegalAnswer input:', question, searchResults, 'output:', answer);
      
      // Step 5: Calculate actual token usage
      console.log('Calculating actual token usage...');
      // const contextTokenPromises = searchResults.map(result => countTokens(result.content));
      // const contextTokenCounts = await Promise.all(contextTokenPromises);
      // const contextTokens = contextTokenCounts.reduce((sum, count) => sum + count, 0);
      // const questionTokens = await countTokens(question);
      // const answerTokens = await countTokens(answer);
      // const actualTokens = questionTokens + answerTokens + Math.min(contextTokens, 1000) + 50;
      // console.log('contextTokens:', contextTokens, 'actualTokens:', actualTokens);
      const actualTokens = (keywordsResult.tokenCount ?? 0) + (keywordsEmbeddingResult.tokenCount ?? 0) + (answerResult.tokenCount ?? 0); 
      
      // Step 6: Update user token usage
      console.log('Updating user token usage...');
      await updateTokenUsage(user.id, actualTokens);
      console.log('updateTokenUsage input:', user.id, actualTokens);
      
      // Step 7: Save Q&A history
      console.log('Saving Q&A history...');
      const documentIds = searchResults.map(result => result.id);
      await saveQAHistory(user.id, question, answer, documentIds);
      console.log('saveQAHistory input:', user.id, question, answer, documentIds);
      
      // Step 8: Log API usage
      console.log('Logging API usage...');
      await logAPIUsage(user.id, 'qa', actualTokens);
      console.log('logAPIUsage input:', user.id, 'qa', actualTokens);

      // Format response
      const response = {
        question: question,
        answer: answer,
        sources: searchResults.map(result => ({
          id: result.id,
          // content: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : ''),
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
    console.error('Q&A API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}

/**
 * Get Q&A history for authenticated user
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

    // Fetch Q&A history from database
    const { data, error } = await supabase
      .from('qa_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('無法獲取問答歷史', 500);
    }

    return createSuccessResponse({
      history: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Q&A history API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}
