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
import { generateConsultantChatResponse, countTokens } from '@/lib/gemini';
import { saveConversation, getConversation, updateTokenUsage } from '@/lib/database';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * Legal Consultant API endpoint with streaming
 * Handles AI-powered legal consultation with real-time progress updates
 */
export async function POST(request: NextRequest) {
  console.log('POST request received at /api/consultant');
  try {
    console.log('Validating method...');
    const validateMethodResult = validateMethod(request, ['POST']);
    console.log('validateMethod input:', request.method);
    console.log('validateMethod output:', validateMethodResult);
    if (!validateMethodResult) {
      return createErrorResponse('不允許使用此方法', 405);
    }

    console.log('Authenticating request...');
    const authResult = await authenticateRequest(request);
    console.log('authenticateRequest input:', request);
    console.log('authenticateRequest output:', authResult);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(authResult.error || '未經授權', 401);
    }
    const user = authResult.user;

    console.log('Checking feature access...');
    const hasFeatureAccessResult = hasFeatureAccess(user, 'consultant');
    console.log('hasFeatureAccess input:', user, 'consultant');
    console.log('hasFeatureAccess output:', hasFeatureAccessResult);
    if (!hasFeatureAccessResult) {
      return createErrorResponse('存取遭拒 - 顧問功能需要付費訂閱', 403);
    }

    console.log('Parsing request body...');
    const body = await request.json();
    const { message, conversationId, conversationHistory = [], useProModel = false } = body;
    console.log('Request body:', { message, conversationId, conversationHistory: conversationHistory?.length || 0, useProModel });

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return createErrorResponse('訊息是必需的');
    }
    if (message.length > 2000) {
      return createErrorResponse('訊息太長 (最多 2000 個字元)');
    }

    console.log('Checking Pro model access...');
    if (useProModel && !canUseProModel(user)) {
      return createErrorResponse('Pro 模型存取需要 VIP 訂閱', 403);
    }

    console.log('Estimating tokens...');
    const estimatedTokens = countTokens(message) + 5000; // Reduced estimate for simple chat
    console.log('countTokens input:', message);
    console.log('countTokens output:', estimatedTokens);
    const hasTokensResult = hasTokens(user, estimatedTokens);
    console.log('hasTokens input:', user, estimatedTokens);
    console.log('hasTokens output:', hasTokensResult);
    if (!hasTokensResult) {
      return createErrorResponse('代幣不足', 402);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let totalTokenUsage = 0;
        let fullConversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

        try {
          send({ type: 'step', content: '正在處理輸入...' });

          // Use conversation history from frontend (client-side memory)
          if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            console.log('Using conversation history from frontend:', conversationHistory.length, 'messages');
            fullConversationHistory = [...conversationHistory];
          } else {
            console.log('No conversation history provided, starting fresh conversation');
          }

          // Add current user message
          const currentTimestamp = new Date().toISOString();
          fullConversationHistory.push({
            role: 'user',
            content: message,
            timestamp: currentTimestamp
          });

          send({ type: 'step', content: '正在生成回應...' });

          // Generate AI response using simplified method
          const chatMessages = fullConversationHistory.map((msg: { role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
            role: (msg.role === 'assistant' ? 'model' : msg.role) as 'user' | 'model',
            content: msg.content
          }));

          console.log('Generating consultant chat response...');
          const response = await generateConsultantChatResponse(chatMessages, useProModel);
          console.log('generateConsultantChatResponse input:', chatMessages, useProModel);
          console.log('generateConsultantChatResponse output:', response);
          totalTokenUsage = response.totalTokenCount;

          // Send response
          send({ type: 'response_chunk', content: response.text });

          // Add AI response to history
          fullConversationHistory.push({
            role: 'assistant',
            content: response.text,
            timestamp: new Date().toISOString()
          });

          // Calculate final tokens (Pro model costs 10x)
          const finalTokens = useProModel ? totalTokenUsage * 10 : totalTokenUsage;
          
          // Update token usage and save conversation
          console.log('Updating token usage...');
          await updateTokenUsage(user.id, finalTokens);
          console.log('updateTokenUsage input:', user.id, finalTokens);

          // Skip conversation saving for Phase 1 - table doesn't exist yet
          console.log('Skipping conversation saving - table not created yet');
          let savedConversationId = conversationId || 'temp-' + Date.now();
          
          // TODO: Create conversations table and re-enable this feature
          // try {
          //   savedConversationId = await saveConversation(
          //     user.id,
          //     conversationId,
          //     fullConversationHistory,
          //     fullConversationHistory.length === 2 ? `諮詢: ${message.substring(0, 50)}...` : undefined
          //   );
          // } catch (saveError) {
          //   console.error('Failed to save conversation:', saveError);
          //   savedConversationId = conversationId || 'temp-' + Date.now();
          // }

          console.log('Logging API usage...');
          await logAPIUsage(user.id, 'consultant', finalTokens);
          console.log('logAPIUsage input:', user.id, 'consultant', finalTokens);

          send({
            type: 'completion',
            content: {
              conversationId: savedConversationId,
              tokensUsed: finalTokens,
              remainingTokens: (user.remaining_tokens || 0) - finalTokens
            }
          });

        } catch (e) {
          console.error('Streaming error:', e);
          send({ type: 'error', content: 'AI 處理失敗' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
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
