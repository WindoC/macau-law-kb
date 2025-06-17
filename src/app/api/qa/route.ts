import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/session';
import {
  hasFeatureAccess,
  hasTokens,
  createErrorResponse,
  validateMethod
} from '@/lib/auth-client';
import {
  generateEmbedding,
  generateSearchKeywords,
  generateLegalAnswer,
  countTokens,
} from '@/lib/gemini';
import {
  searchDocuments,
  saveQAHistory,
  updateTokenUsage,
} from '@/lib/database-new';

// Temporarily disable Edge Runtime due to jsonwebtoken dependency
// export const runtime = 'edge';
export const runtime = 'nodejs';

/**
 * Legal Q&A API endpoint (Streaming)
 * Handles AI-powered legal question answering with context from vector search
 */
export async function POST(request: NextRequest) {
  try {
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

    const hasFeatureAccessResult = hasFeatureAccess(user, 'qa');
    if (!hasFeatureAccessResult) {
      return createErrorResponse('存取遭拒', 403);
    }

    const { question } = await request.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return createErrorResponse('問題是必需的');
    }
    if (question.length > 2000) {
      return createErrorResponse('問題太長 (最多 2000 個字元)');
    }

    const estimatedTokens = countTokens(question) + 10000;
    const hasTokensResult = hasTokens(user, estimatedTokens);
    if (!hasTokensResult) {
      return createErrorResponse('代幣不足', 402);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: 'step', content: '正在生成搜尋關鍵字...' });
          const keywordsResult = await generateSearchKeywords(question);
          // console.log('generateSearchKeywords output:', keywordsResult.keywords);

          send({ type: 'step', content: '正在生成嵌入向量以用於搜尋...' });
          const keywordsEmbeddingResult = await generateEmbedding(keywordsResult.keywords.join(' '));

          send({ type: 'step', content: '正在搜尋文件...' });
          const searchResults = await searchDocuments(keywordsEmbeddingResult.embedding, 20);

          if (searchResults.length === 0) {
            send({ type: 'error', content: '找不到與您的問題相關的法律文件' });
            controller.close();
            return;
          }

          send({ type: 'step', content: '正在生成 AI 答案...' });
          const answerResult = await generateLegalAnswer(question, searchResults);
          const answer = answerResult.answer;
          send({ type: 'answer_chunk', content: answer });

          send({ type: 'sources', content: searchResults });

          const actualTokens =
            (keywordsResult.tokenCount ?? 0) +
            (keywordsEmbeddingResult.tokenCount ?? 0) +
            (answerResult.tokenCount ?? 0) ;

          const remaining_tokens = await updateTokenUsage(session, 'qa', actualTokens);
          const documentIds = searchResults.map((result) => result.id);
          await saveQAHistory(session, question, answer, documentIds, actualTokens);

          send({
            type: 'tokens',
            content: {
              tokens_used: actualTokens,
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
    console.error('Q&A API error:', error);
    return createErrorResponse('內部伺服器錯誤', 500);
  }
}
