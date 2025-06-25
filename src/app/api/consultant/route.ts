import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/session';
import {
  hasFeatureAccess,
  hasTokens,
  canUseProModel,
  createErrorResponse,
  validateMethod
} from '@/lib/auth-client';
import { generateConsultantChatResponse, countTokens , generateEmbedding , searchResultsToMarkdown } from '@/lib/gemini';
import { saveConversation, updateTokenUsage , searchDocuments } from '@/lib/database-new';

// Temporarily disable Edge Runtime due to jsonwebtoken dependency
// export const runtime = 'edge';
export const runtime = 'nodejs';

/**
 * Legal Consultant API endpoint with streaming
 * Handles AI-powered legal consultation with real-time progress updates
 */
export async function POST(request: NextRequest) {
  // console.log('POST request received at /api/consultant');
  try {
    // Validate method
    if (!validateMethod(request, ['POST'])) {
      return createErrorResponse('不允許使用此方法', 405);
    }

    // Authenticate user
    const session = await SessionManager.getSession(request);
    if (!session) {
      return createErrorResponse('未經授權', 401);
    }

    // Get user profile to check permissions and tokens
    const profileResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/profile`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    if (!profileResponse.ok) {
      return createErrorResponse('無法獲取用戶資料', 401);
    }

    const user = await profileResponse.json();

    // console.log('Checking feature access...');
    const hasFeatureAccessResult = hasFeatureAccess(user, 'consultant');
    // console.log('hasFeatureAccess input:', user, 'consultant');
    // console.log('hasFeatureAccess output:', hasFeatureAccessResult);
    if (!hasFeatureAccessResult) {
      return createErrorResponse('存取遭拒 - 顧問功能需要付費訂閱', 403);
    }

    // console.log('Parsing request body...');
    const body = await request.json();
    const { message, conversationId, conversationHistory = [], useProModel = false } = body;
    // console.log('Request body:', { message, conversationId, conversationHistory: conversationHistory?.length || 0, useProModel });

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return createErrorResponse('訊息是必需的');
    }
    if (message.length > 2000) {
      return createErrorResponse('訊息太長 (最多 2000 個字元)');
    }

    // console.log('Checking Pro model access...');
    if (useProModel && !canUseProModel(user)) {
      return createErrorResponse('Pro 模型存取需要 VIP 訂閱', 403);
    }

    // console.log('Estimating tokens...');
    const estimatedTokens = countTokens(message) + 5000; // Reduced estimate for simple chat
    // console.log('countTokens input:', message);
    // console.log('countTokens output:', estimatedTokens);
    const hasTokensResult = hasTokens(user, estimatedTokens);
    // console.log('hasTokens input:', user, estimatedTokens);
    // console.log('hasTokens output:', hasTokensResult);
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
        let fullConversationHistory: Array<{ role: 'user' | 'assistant'; content: string; documents_ids?: number[]; tokens_used?: number; timestamp: string }> = [];

        try {
          send({ type: 'step', content: '正在處理輸入...' });

          // Use conversation history from frontend (client-side memory)
          if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            // console.log('Using conversation history from frontend:', conversationHistory.length, 'messages');
            fullConversationHistory = [...conversationHistory];
          } else {
            // console.log('No conversation history provided, starting fresh conversation');
          }

          // Add current user message
          const currentTimestamp = new Date().toISOString();
          fullConversationHistory.push({
            role: 'user',
            content: message,
            timestamp: currentTimestamp
          });

          send({ type: 'step', content: '正在生成回應...' });

          // Format messages for Gemini API - following the example pattern
          const contents = fullConversationHistory.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' as const : msg.role,
            parts: [{ text: msg.content }]
          }));

          // console.log('Generating consultant chat response...');
          let response = await generateConsultantChatResponse(contents, useProModel) ;
          // console.log('generateConsultantChatResponse input:', contents, useProModel);
          // console.log('generateConsultantChatResponse output:', response);

          if (!response ) {
            throw new Error('AI 回應無效');
          }
          
          totalTokenUsage = response.usageMetadata?.totalTokenCount ?? 0;

          const documents_ids = []

          while (response.functionCalls) {

            if (response && response.text) {
              // Send response
              send({ type: 'response_chunk', content: response.text + "\n---\n" });
            }

            // console.log('Processing function calls:', response.functionCalls);
            send({ type: 'step', content: '正在處理函數調用請求...'  });


            // Step 2: Extract all function calls from the response
            let functionCallsArray: any[] = [];
            if (
              response.candidates &&
              response.candidates[0] &&
              response.candidates[0].content &&
              response.candidates[0].content.parts
            ) {
              functionCallsArray = response.candidates[0].content.parts
                .filter((part: any) => part.functionCall)
                .map((part: any) => part.functionCall);
            } else {
              // console.log("No valid candidates or content parts found in the response.");
              throw new Error('AI 函數調用回應無效');
            }

            // console.log("Function calls found:", functionCallsArray.length);
            functionCallsArray.forEach((call: any, index: number) => {
              // console.log(`Function call ${index + 1}:`, call);
            });

            const functionResponses = [];
  
            for (const functionCall of functionCallsArray) {

              if (functionCall.name == "searchMacauLegalKnowledgeBase") {
                // console.log("Function call: searchMacauLegalKnowledgeBase");
                // Extract the keywords from the function call arguments
                const keywords = functionCall.args.keywords;
                // console.log("Keywords for search:", keywords);
                // Call the search function with the keywords

                send({ type: 'step', content: '正在生成嵌入向量以用於搜尋...' });
                const keywordsEmbeddingResult = await generateEmbedding(keywords);

                totalTokenUsage += keywordsEmbeddingResult.tokenCount || 0;

                send({ type: 'step', content: '正在搜尋文件...' });
                const searchResults = await searchDocuments(keywordsEmbeddingResult.embedding, 20);
                // console.log('searchDocuments done');

                // Create a function response part for this call
                const functionResponsePart = {
                  functionResponse: {
                    name: functionCall.name,
                    response: { result: "" }
                  }
                };

                if (searchResults.length === 0) {
                  send({ type: 'error', content: '找不到與您的問題相關的法律文件' });
                  functionResponsePart.functionResponse.response.result = "";
                }
                else {
                  // console.log('searchDocuments number of results: ', searchResults.length);
                  functionResponsePart.functionResponse.response.result = searchResultsToMarkdown(searchResults);
                  documents_ids.push(...searchResults.map(doc => doc.id));
                }
                functionResponses.push(functionResponsePart);
              }
            }

            send({ type: 'step', content: '正在生成回應...' });

            // Append function call and all function responses to contents
            contents.push({
              role: 'model',
              parts: response.candidates[0].content.parts || []
            } as any);
            contents.push({
              role: 'user',
              parts: functionResponses as any
            });

            // Get the final response from the model
            // console.log('Generating consultant chat response...');
            response = await generateConsultantChatResponse(contents, useProModel) ;
            // console.log('generateConsultantChatResponse input:', contents, useProModel);
            // console.log('generateConsultantChatResponse output:', response);

            if (!response) {
              throw new Error('AI 回應無效');
            }

            totalTokenUsage += response.usageMetadata?.totalTokenCount ?? 0;
          }

          // console.log('finial response:', response);
          // console.log('documents_ids: ', documents_ids);

          if (!response || !response.text) {
              throw new Error('AI 回應無效');
          }
          // console.log('response.text: ', response.text);

          // Send response
          send({ type: 'response_chunk', content: response.text });

          // Calculate final tokens (Pro model costs 10x)
          const finalTokens = useProModel ? totalTokenUsage * 10 : totalTokenUsage;

          // Add AI response to history
          fullConversationHistory.push({
            role: 'assistant',
            content: response.text ?? '',
            documents_ids: documents_ids,
            tokens_used: finalTokens,
            timestamp: new Date().toISOString()
          });

          // Update token usage and save conversation
          const remaining_tokens = await updateTokenUsage(session, 'consultant', finalTokens);

          // Save conversation and messages
          let savedConversationId = conversationId;

          try {
            const modelName = useProModel ? 'pro' : 'flash';
            const conversationTitle = fullConversationHistory.length === 2 ? `諮詢: ${message.substring(0, 50)}...` : undefined;
            
            savedConversationId = await saveConversation(
              session,
              conversationId,
              fullConversationHistory,
              conversationTitle,
              finalTokens,
              modelName
            );
          } catch (saveError) {
            console.error('Failed to save conversation:', saveError);
            // Fallback to temporary ID if saving fails
            savedConversationId = conversationId || 'temp-' + Date.now();
          }

          send({
            type: 'completion',
            content: {
              conversationId: savedConversationId,
              tokens_used: finalTokens,
              remaining_tokens: remaining_tokens || 0
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
