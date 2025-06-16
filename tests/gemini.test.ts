/**
 * Gemini AI Service Tests
 * Tests for AI functionality including embeddings, search, and response generation
 */

import * as geminiService from '../src/lib/gemini';

// Mock the Google GenAI
jest.mock('@google/genai', () => {
  const mockModels = {
    embedContent: jest.fn(),
    generateContent: jest.fn(),
    countTokens: jest.fn(),
  };

  const mockGenAI = {
    models: mockModels,
  };

  return {
    GoogleGenAI: jest.fn(() => mockGenAI),
    FunctionCallingConfigMode: {
      AUTO: 'AUTO',
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
    },
  };
});

describe('Gemini AI Service', () => {
  let mockModels: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { GoogleGenAI } = require('@google/genai');
    const mockGenAI = new GoogleGenAI();
    mockModels = mockGenAI.models;
  });

  describe('Embedding Generation', () => {
    test('should generate embeddings successfully', async () => {
      const mockEmbedding = {
        embeddings: [{
          values: [0.1, 0.2, 0.3, 0.4, 0.5],
        }],
      };

      mockModels.embedContent.mockResolvedValue(mockEmbedding);

      const result = await geminiService.generateEmbedding('test text');

      expect(mockModels.embedContent).toHaveBeenCalledWith({
        model: 'gemini-embedding-exp-03-07',
        contents: 'test text',
      });
      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        tokenCount: expect.any(Number),
      });
    });

    test('should handle embedding generation errors', async () => {
      mockModels.embedContent.mockRejectedValue(new Error('API Error'));

      await expect(geminiService.generateEmbedding('test text'))
        .rejects.toThrow('Failed to generate embedding');
    });

    test('should handle invalid embedding response', async () => {
      mockModels.embedContent.mockResolvedValue({
        embeddings: [], // Empty embeddings
      });

      await expect(geminiService.generateEmbedding('test text'))
        .rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('Search Keywords Generation', () => {
    test('should generate search keywords successfully', async () => {
      const mockResponse = {
        text: 'keyword1\nkeyword2\nkeyword3',
        usageMetadata: {
          totalTokenCount: 50,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateSearchKeywords('What is the law about contracts?');

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: expect.stringContaining('作為澳門法律專家'),
      });
      expect(result).toEqual({
        keywords: ['keyword1', 'keyword2', 'keyword3'],
        tokenCount: 50,
      });
    });

    test('should handle search keywords generation errors', async () => {
      mockModels.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(geminiService.generateSearchKeywords('test query'))
        .rejects.toThrow('Failed to generate search keywords');
    });

    test('should filter empty keywords', async () => {
      const mockResponse = {
        text: 'keyword1\n\nkeyword2\n   \nkeyword3',
        usageMetadata: {
          totalTokenCount: 30,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateSearchKeywords('test query');

      expect(result.keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });

    test('should limit keywords to 5', async () => {
      const mockResponse = {
        text: 'keyword1\nkeyword2\nkeyword3\nkeyword4\nkeyword5\nkeyword6\nkeyword7',
        usageMetadata: {
          totalTokenCount: 40,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateSearchKeywords('test query');

      expect(result.keywords).toHaveLength(5);
      expect(result.keywords).toEqual(['keyword1', 'keyword2', 'keyword3', 'keyword4', 'keyword5']);
    });
  });

  describe('Legal Answer Generation', () => {
    test('should generate legal answer successfully', async () => {
      const mockResponse = {
        text: 'According to Macau law, contracts require...',
        usageMetadata: {
          totalTokenCount: 100,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const mockDocuments = [
        { 
          content: 'Contract law document 1',
          metadata: { law_id: 'LAW001', title: 'Contract Law', loc: { lines: { from: 1, to: 10 } } },
          similarity: 0.85,
        },
        { 
          content: 'Contract law document 2',
          metadata: { law_id: 'LAW002', title: 'Civil Code', loc: { lines: { from: 20, to: 30 } } },
          similarity: 0.78,
        },
      ];

      const result = await geminiService.generateLegalAnswer(
        'What is required for a valid contract?',
        mockDocuments
      );

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: expect.stringContaining('你是澳門法律專家AI助手'),
      });
      expect(result).toEqual({
        answer: 'According to Macau law, contracts require...',
        tokenCount: 100,
      });
    });

    test('should handle legal answer generation errors', async () => {
      mockModels.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        geminiService.generateLegalAnswer('test question', [])
      ).rejects.toThrow('Failed to generate legal answer');
    });

    test('should work with empty documents array', async () => {
      const mockResponse = {
        text: 'I need more specific legal documents to provide an accurate answer.',
        usageMetadata: {
          totalTokenCount: 50,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateLegalAnswer('test question', []);

      expect(result.answer).toContain('I need more specific legal documents');
      expect(result.tokenCount).toBe(50);
    });

    test('should handle invalid response', async () => {
      mockModels.generateContent.mockResolvedValue({
        text: null, // Invalid response
      });

      await expect(
        geminiService.generateLegalAnswer('test question', [])
      ).rejects.toThrow('Failed to generate legal answer');
    });
  });

  describe('Consultant Response Generation', () => {
    test('should generate consultant response successfully', async () => {
      const mockResponse = {
        text: 'Based on the legal documents provided...',
        usageMetadata: {
          totalTokenCount: 80,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const mockMessages = [
        { role: 'user' as const, content: 'What about employment law?' },
        { role: 'assistant' as const, content: 'Employment law in Macau...' },
      ];

      const result = await geminiService.generateConsultantResponse(mockMessages);

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: expect.stringContaining('你是專業的澳門法律顧問AI助手'),
      });
      expect(result).toBe('Based on the legal documents provided...');
    });

    test('should use Pro model when specified', async () => {
      const mockResponse = {
        text: 'Pro model response',
        usageMetadata: {
          totalTokenCount: 120,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateConsultantResponse([], true);

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-pro-preview-05-06',
        contents: expect.any(String),
      });
      expect(result).toBe('Pro model response');
    });

    test('should handle consultant response generation errors', async () => {
      mockModels.generateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        geminiService.generateConsultantResponse([])
      ).rejects.toThrow('Failed to generate consultant response');
    });

    test('should handle invalid response', async () => {
      mockModels.generateContent.mockResolvedValue({
        text: null, // Invalid response
      });

      await expect(
        geminiService.generateConsultantResponse([])
      ).rejects.toThrow('Failed to generate consultant response');
    });
  });

  describe('Consultant Chat Response Generation', () => {
    test('should generate consultant chat response successfully', async () => {
      const mockResponse = {
        text: 'Chat response text',
        usageMetadata: {
          totalTokenCount: 90,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const mockContents = [
        { role: 'user' as const, parts: [{ text: 'Hello' }] },
        { role: 'model' as const, parts: [{ text: 'Hi there!' }] },
      ];

      const result = await geminiService.generateConsultantChatResponse(mockContents);

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: mockContents,
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('你是專業的澳門法律顧問AI助手'),
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    test('should use Pro model when specified', async () => {
      const mockResponse = {
        text: 'Pro chat response',
        usageMetadata: {
          totalTokenCount: 150,
        },
      };

      mockModels.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateConsultantChatResponse([], true);

      expect(mockModels.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-pro-preview-05-06',
        contents: [],
        config: expect.any(Object),
      });
      expect(result).toEqual(mockResponse);
    });

    test('should handle chat response generation errors', async () => {
      mockModels.generateContent.mockRejectedValue(new Error('Chat Error'));

      await expect(
        geminiService.generateConsultantChatResponse([])
      ).rejects.toThrow('Failed to generate consultant response');
    });
  });

  describe('Token Counting', () => {
    test('should count tokens correctly', () => {
      const text = 'This is a test sentence with multiple words.';
      const tokenCount = geminiService.countTokens(text);

      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBe(Math.ceil(text.length / 4));
    });

    test('should handle empty text', () => {
      const tokenCount = geminiService.countTokens('');
      expect(tokenCount).toBe(0);
    });

    test('should handle Chinese text', () => {
      const chineseText = '這是一個測試句子';
      const tokenCount = geminiService.countTokens(chineseText);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBe(Math.ceil(chineseText.length / 4));
    });
  });

  describe('Search Results to Markdown', () => {
    test('should convert search results to markdown format', () => {
      const searchResults = [
        {
          content: 'Legal content 1',
          metadata: {
            law_id: 'LAW001',
            title: 'Contract Law',
            loc: { lines: { from: 1, to: 10 } },
          },
          similarity: 0.85,
        },
        {
          content: 'Legal content 2',
          metadata: {
            law_id: 'LAW002',
            title: 'Civil Code',
            loc: { lines: { from: 20, to: 30 } },
          },
          similarity: 0.78,
        },
      ];

      const markdown = geminiService.searchResultsToMarkdown(searchResults);

      expect(markdown).toContain('文件 1 / LAW001 - Contract Law');
      expect(markdown).toContain('文件 2 / LAW002 - Civil Code');
      expect(markdown).toContain('Legal content 1');
      expect(markdown).toContain('Legal content 2');
      expect(markdown).toContain('相關度: 85%');
      expect(markdown).toContain('相關度: 78%');
    });

    test('should handle empty search results', () => {
      const markdown = geminiService.searchResultsToMarkdown([]);
      expect(markdown).toBe('');
    });
  });

  describe('Error Handling and Logging', () => {
    test('should log errors appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockModels.embedContent.mockRejectedValue(new Error('Test error'));

      await expect(geminiService.generateEmbedding('test'))
        .rejects.toThrow('Failed to generate embedding');

      expect(consoleSpy).toHaveBeenCalledWith('Error generating embedding:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle API rate limiting gracefully', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockModels.generateContent.mockRejectedValue(rateLimitError);

      await expect(
        geminiService.generateSearchKeywords('test query')
      ).rejects.toThrow('Failed to generate search keywords');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockModels.embedContent.mockRejectedValue(networkError);

      await expect(geminiService.generateEmbedding('test'))
        .rejects.toThrow('Failed to generate embedding');
    });
  });
});