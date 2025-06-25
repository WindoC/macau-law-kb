import { GoogleGenAI , FunctionCallingConfigMode , Type , GenerateContentResponse, Schema } from '@google/genai';

/**
 * Gemini AI service for legal document processing
 * Handles embedding generation and text generation using different Gemini models
 */

// Initialize Gemini AI with API key
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});

// Model configurations
const MODELS = {
  FLASH: 'gemini-2.5-flash-preview-05-20',
  PRO: 'gemini-2.5-pro-preview-05-06',
  EMBEDDING: 'gemini-embedding-exp-03-07'
} as const;

/**
 * Generate embeddings for text using Gemini embedding model
 * @param text - Text to generate embeddings for
 * @returns Promise<{ embedding: number[]; tokenCount: number | undefined }> - Object containing array of embedding values and the token count
 */
export async function generateEmbedding(text: string): Promise<{ embedding: number[]; tokenCount: number | undefined }> {
  try {
    // const countTokensResponse = await ai.models.countTokens({
    //   model: MODELS.EMBEDDING,
    //   contents: text,
    // });
    
    // if (countTokensResponse.totalTokens === undefined) {
    //   throw new Error('Invalid token count response');
    // }
    
    const response = await ai.models.embedContent({
      model: MODELS.EMBEDDING,
      contents: text,
    });
    
    if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
      throw new Error('Invalid embedding response');
    }
    
    return {
      embedding: response.embeddings[0].values,
      // tokenCount: countTokensResponse.totalTokens,
      tokenCount: countTokens(text), // Use a simple token count function for now
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate search keywords from user query using Gemini Flash
 * @param query - User's search query
 * @returns Promise<{ keywords: string[]; tokenCount: number | undefined }> - Object containing array of optimized search keywords and token count
 */
export async function generateSearchKeywords(query: string): Promise<{ keywords: string[]; tokenCount: number | undefined }> {
  try {
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

    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
    });
    
    if (!response.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const keywords = response.text
      .split('\n')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .slice(0, 5);

    return {
      keywords: keywords,
      tokenCount: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error('Error generating search keywords:', error);
    throw new Error('Failed to generate search keywords');
  }
}

export const searchResultsToMarkdown = (searchResults: Array<{ content: string; metadata: any; similarity: number }>): string => {
  return searchResults
      .map((result, index) => `
文件 ${index + 1} / ${result.metadata.law_id} - ${result.metadata.title} / 第 ${result.metadata.loc.lines.from} 至 ${result.metadata.loc.lines.to} 行 / (相關度: ${Math.round(result.similarity * 100)}%):
${result.content}
---`)
      .join('\n');
}

/**
 * Generate legal answer from search results using Gemini Flash
 * @param question - User's question
 * @param searchResults - Relevant document chunks from vector search
 * @returns Promise<{ answer: string; tokenCount: number | undefined }> - AI-generated legal answer and token count
 */
export async function generateLegalAnswer(
  question: string,
  searchResults: Array<{ content: string; metadata: any; similarity: number }>
): Promise<{ answer: string; tokenCount: number | undefined }> {
  try {
    const context = searchResultsToMarkdown(searchResults);

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

    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
    });
    
    if (!response.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    return {
      answer: response.text,
      tokenCount: response.usageMetadata?.totalTokenCount,
    };
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

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    
    if (!response.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    return response.text;
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


// System instruction for legal consultant
const LEGAL_CONSULTANT_INSTRUCTION = `
你是專業的澳門法律顧問AI助手。請遵循以下原則：

1. 提供專業、準確的澳門法律建議
2. 必需先在澳門法律知識庫中搜尋相關資訊
3. 使用繁體中文回答
4. 保持對話的連貫性和上下文理解
5. 當需要更詳細的法律資訊時，主動詢問相關細節
6. 引用相關的澳門法律條文和案例
7. 保持專業但友善的語調
8. 如果涉及複雜法律問題，建議尋求專業律師協助
9. 基於對話歷史提供連貫的建議
10. 如果信息不足，請說明限制並要求更多細節
`;

const SEARCH_MACAU_LEGAL_KB = {
  name: "searchMacauLegalKnowledgeBase",
  parameters: {
    type: Type.OBJECT,
    description:
      "根據提供的關鍵字，從澳門法律知識庫中檢索相關的內容片段。適用於查詢澳門地區的法律資訊、法規條文或案例資料。",
    properties: {
      keywords: {
        type: Type.STRING,
        description:
          "用於查詢澳門法律知識庫的關鍵字或詞語。建議輸入與法律主題、條文名稱、法規或案例相關的詞彙。",
      },
    },
    required: ["keywords"],
  },
} as Schema;

const CONSULTANT_CONFIG = {
  systemInstruction: LEGAL_CONSULTANT_INSTRUCTION,
  toolConfig: {
    functionCallingConfig: {
      mode: FunctionCallingConfigMode.AUTO,
    },
  },
  tools: [
    {
      functionDeclarations: [
        SEARCH_MACAU_LEGAL_KB,
      ]
    }
  ],
}

/**
 * Generate consultant chat response using direct generateContent method
 * @param messages - Conversation history
 * @param useProModel - Whether to use Pro model
 * @returns Promise< GenerateContentResponse > - AI response and token count
 */
export async function generateConsultantChatResponse(
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  useProModel: boolean = false
): Promise< GenerateContentResponse > {
  try {
    const modelName = useProModel ? MODELS.PRO : MODELS.FLASH;
    
    // console.log(`Generating consultant response with ${contents.length} messages in conversation history`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: CONSULTANT_CONFIG,
    });
    
    // if (!response.text) {
    //   throw new Error('Invalid response from Gemini API');
    // }
    
    // console.log(`Generated response with ${response.usageMetadata?.totalTokenCount || 0} tokens`);
    
    return response;
    
  } catch (error) {
    console.error('Error generating consultant chat response:', error);
    throw new Error('Failed to generate consultant response');
  }
}
