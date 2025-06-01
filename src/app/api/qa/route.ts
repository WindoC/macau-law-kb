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
import { generateEmbedding, generateLegalAnswer, countTokens } from '@/lib/gemini';
import { searchDocuments, saveQAHistory, updateTokenUsage } from '@/lib/database';
import { supabase } from '@/lib/supabase';

/**
 * Legal Q&A API endpoint
 * Handles AI-powered legal question answering with context from vector search
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
    if (!hasFeatureAccess(user, 'qa')) {
      return createErrorResponse('Access denied', 403);
    }

    // Parse request body
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return createErrorResponse('Question is required');
    }

    if (question.length > 2000) {
      return createErrorResponse('Question too long (max 2000 characters)');
    }

    // Estimate token usage
    const estimatedTokens = countTokens(question) + 200; // Higher cost for Q&A

    // Check token availability
    if (!hasTokens(user, estimatedTokens)) {
      return createErrorResponse('Insufficient tokens', 402);
    }

    try {
      // Step 1: Generate embedding for the question
      const questionEmbedding = await generateEmbedding(question);
      
      // Step 2: Search for relevant documents
      const searchResults = await searchDocuments(questionEmbedding, 5);
      
      if (searchResults.length === 0) {
        return createErrorResponse('No relevant legal documents found for your question');
      }

      // Step 3: Generate AI answer based on search results
      const answer = await generateLegalAnswer(question, searchResults);
      
      // Step 4: Calculate actual token usage
      const contextTokens = searchResults.reduce((sum, result) => sum + countTokens(result.content), 0);
      const actualTokens = countTokens(question) + countTokens(answer) + Math.min(contextTokens, 1000) + 50;
      
      // Step 5: Update user token usage
      await updateTokenUsage(user.id, actualTokens);
      
      // Step 6: Save Q&A history
      const documentIds = searchResults.map(result => result.id);
      await saveQAHistory(user.id, question, answer, documentIds);
      
      // Step 7: Log API usage
      await logAPIUsage(user.id, 'qa', actualTokens, {
        question_length: question.length,
        answer_length: answer.length,
        sources_count: searchResults.length
      });

      // Format response
      const response = {
        question: question,
        answer: answer,
        sources: searchResults.map(result => ({
          id: result.id,
          content: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : ''),
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
    console.error('Q&A API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Get Q&A history for authenticated user
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

    // Fetch Q&A history from database
    const { data, error } = await supabase
      .from('qa_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('Failed to fetch Q&A history', 500);
    }

    return createSuccessResponse({
      history: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Q&A history API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
