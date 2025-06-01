import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini AI service for legal document processing
 * Handles embedding generation and text generation using different Gemini models
 */

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Model configurations
const MODELS = {
  FLASH: 'gemini-2.0-flash-exp',
  PRO: 'gemini-1.5-pro',
  EMBEDDING: 'text-embedding-004'
} as const;

/**
 * Generate embeddings for text using Gemini embedding model
 * @param text - Text to generate embeddings for
 * @returns Promise<number[]> - Array of embedding values
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: MODELS.EMBEDDING });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate search keywords from user query using Gemini Flash
 * @param query - User's search query
 * @returns Promise<string[]> - Array of optimized search keywords
 */
export async function generateSearchKeywords(query: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: MODELS.FLASH });
    
    const prompt = `
作為澳門法律專家，分析以下用戶查詢並生成最佳的搜索關鍵詞：

用戶查詢: "${query}"

請提供3-5個最相關的法律搜索關鍵詞，這些關鍵詞應該：
1. 包含核心法律概念
2. 使用澳門法律術語
3. 涵蓋相關的法律領域
4. 適合向量搜索

只返回關鍵詞，每行一個，不要其他解釋。
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    return response
      .split('\n')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .slice(0, 5);
  } catch (error) {
    console.error('Error generating search keywords:', error);
    throw new Error('Failed to generate search keywords');
  }
}

/**
 * Generate legal answer from search results using Gemini Flash
 * @param question - User's question
 * @param searchResults - Relevant document chunks from vector search
 * @returns Promise<string> - AI-generated legal answer
 */
export async function generateLegalAnswer(
  question: string,
  searchResults: Array<{ content: string; metadata: any; similarity: number }>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: MODELS.FLASH });
    
    const context = searchResults
      .map((result, index) => `
文件 ${index + 1} (相關度: ${Math.round(result.similarity * 100)}%):
${result.content}
---`)
      .join('\n');

    const prompt = `
你是澳門法律專家AI助手。基於以下法律文件內容，回答用戶的法律問題。

用戶問題: "${question}"

相關法律文件:
${context}

請提供專業、準確的法律答案，要求：
1. 基於提供的法律文件內容
2. 使用繁體中文回答
3. 結構清晰，包含要點
4. 如果信息不足，請說明限制
5. 提及相關的法律條文或規定

答案:
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating legal answer:', error);
    throw new Error('Failed to generate legal answer');
  }
}

/**
 * Generate consultant response for chat conversation
 * @param messages - Conversation history
 * @param useProModel - Whether to use Pro model (for VIP users)
 * @returns Promise<string> - AI consultant response
 */
export async function generateConsultantResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  useProModel: boolean = false
): Promise<string> {
  try {
    const modelName = useProModel ? MODELS.PRO : MODELS.FLASH;
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const conversationHistory = messages
      .map(msg => `${msg.role === 'user' ? '用戶' : 'AI法律顧問'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `
你是專業的澳門法律顧問AI助手。請基於以下對話歷史，提供專業的法律建議和指導。

對話歷史:
${conversationHistory}

請遵循以下原則：
1. 提供專業、準確的澳門法律建議
2. 使用繁體中文回答
3. 保持對話的連貫性
4. 如需更多信息，主動詢問
5. 引用相關的澳門法律條文
6. 保持專業但友善的語調
7. 如果涉及複雜法律問題，建議尋求專業律師協助

AI法律顧問回應:
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating consultant response:', error);
    throw new Error('Failed to generate consultant response');
  }
}

/**
 * Count tokens in text (approximate)
 * @param text - Text to count tokens for
 * @returns number - Approximate token count
 */
export function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for Chinese text
  return Math.ceil(text.length / 4);
}
