import { NextRequest } from 'next/server';
import { 
  authenticateRequest, 
  hasFeatureAccess, 
  hasTokens, 
  canUseProModel,
  createErrorResponse, 
  createSuccessResponse,
  validateMethod,
  logAPIUsage
} from '@/lib/auth';
import { generateConsultantResponse, countTokens } from '@/lib/gemini';
import { saveConversation, getConversation, updateTokenUsage } from '@/lib/database';
import { supabase } from '@/lib/supabase';

/**
 * Legal Consultant API endpoint
 * Handles AI-powered legal consultation with conversation history
 */
export async function POST(request: NextRequest) {
  console.log('POST request received at /api/consultant'); // Debug log
  try {
    // Validate request method
    if (!validateMethod(request, ['POST'])) {
      console.log('Method not allowed'); // Debug log
      return createErrorResponse('不允許使用此方法', 405);
    }

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('Authentication failed'); // Debug log
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;
    console.log('User authenticated:', user.id); // Debug log

    // Check feature access
    if (!hasFeatureAccess(user, 'consultant')) {
      console.log('Feature access denied'); // Debug log
      return createErrorResponse('存取遭拒 - 顧問功能需要付費訂閱', 403);
    }

    // Parse request body
    const body = await request.json();
    const { message, conversationId, useProModel = false } = body;
    console.log('Request body:', body); // Debug log

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('Message is required'); // Debug log
      return createErrorResponse('訊息是必需的');
    }

    if (message.length > 3000) {
      console.log('Message too long'); // Debug log
      return createErrorResponse('訊息太長 (最多 3000 個字元)');
    }

    // Check if user can use Pro model
    if (useProModel && !canUseProModel(user)) {
      console.log('Pro model access denied'); // Debug log
      return createErrorResponse('Pro 模型存取需要 VIP 訂閱', 403);
    }

    // Estimate token usage (Pro model costs 10x more)
    const baseTokens = countTokens(message) + 300;
    const estimatedTokens = useProModel ? baseTokens * 10 : baseTokens;

    // Check token availability
    if (!hasTokens(user, estimatedTokens)) {
      console.log('Not enough tokens'); // Debug log
      return createErrorResponse('代幣不足', 402);
    }

    try {
      // Step 1: Get conversation history if conversationId provided
      let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];
      
      if (conversationId) {
        console.log('Conversation ID provided:', conversationId); // Debug log
        const conversation = await getConversation(conversationId, user.id);
        if (conversation) {
          conversationHistory = conversation.messages;
          console.log('Conversation history retrieved:', conversationHistory.length); // Debug log
        } else {
          console.log('Conversation not found'); // Debug log
        }
      }

      // Step 2: Add current user message to history
      const currentTimestamp = new Date().toISOString();
      conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: currentTimestamp
      });

      // Step 3: Generate AI response
      const aiResponse = await generateConsultantResponse(
        conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        useProModel
      );
      console.log('AI response generated'); // Debug log

      // Step 4: Add AI response to history
      conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });

      // Step 5: Calculate actual token usage
      const conversationTokens = conversationHistory.reduce((sum, msg) => sum + countTokens(msg.content), 0);
      const actualTokens = Math.min(conversationTokens, useProModel ? 5000 : 1500) + (useProModel ? 100 : 50);
      const finalTokens = useProModel ? actualTokens * 10 : actualTokens;

      // Step 6: Update user token usage
      await updateTokenUsage(user.id, finalTokens);
      console.log('Token usage updated:', finalTokens); // Debug log

      // Step 7: Save conversation
      const savedConversationId = await saveConversation(
        user.id,
        conversationId,
        conversationHistory,
        conversationHistory.length === 2 ? `諮詢: ${message.substring(0, 50)}...` : undefined
      );
      console.log('Conversation saved:', savedConversationId); // Debug log

      // Step 8: Log API usage
      await logAPIUsage(user.id, 'consultant', finalTokens);
      console.log('API usage logged'); // Debug log

      // Format response
      const response = {
        message: aiResponse,
        conversationId: savedConversationId,
        tokens_used: finalTokens,
        remaining_tokens: (user.remaining_tokens || 0) - finalTokens,
        model_used: useProModel ? 'gemini-pro' : 'gemini-flash',
      };
      console.log('Response:', response); // Debug log

      return createSuccessResponse(response);

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      return createErrorResponse('AI 處理失敗', 500);
    }

  } catch (error) {
    console.error('Consultant API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}

/**
 * Get conversation history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Check feature access
    if (!hasFeatureAccess(user, 'consultant')) {
      return createErrorResponse('存取遭拒', 403);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (conversationId) {
      // Get specific conversation
      const conversation = await getConversation(conversationId, user.id);
      if (!conversation) {
        return createErrorResponse('找不到對話', 404);
      }
      return createSuccessResponse({ conversation });
    } else {
      // Get conversation list
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse('無法獲取對話', 500);
      }

      return createSuccessResponse({
        conversations: data || [],
        total: data?.length || 0
      });
    }

  } catch (error) {
    console.error('Consultant history API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}

/**
 * Delete conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    // Check feature access
    if (!hasFeatureAccess(user, 'consultant')) {
      return createErrorResponse('存取遭拒', 403);
    }

    // Get conversation ID from query parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return createErrorResponse('需要對話 ID');
    }

    // Delete conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('無法刪除對話', 500);
    }

    return createSuccessResponse({ message: '成功刪除對話' });

  } catch (error) {
    console.error('Delete conversation API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}
