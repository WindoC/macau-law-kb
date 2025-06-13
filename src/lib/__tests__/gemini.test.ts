// Mock the entire gemini module
jest.mock('../gemini', () => ({
  generateEmbedding: jest.fn(),
  generateSearchKeywords: jest.fn(),
  generateLegalAnswer: jest.fn(),
  countTokens: jest.fn(),
}));

import { generateEmbedding, generateSearchKeywords, generateLegalAnswer, countTokens } from '../gemini';

const mockGenerateEmbedding = generateEmbedding as jest.MockedFunction<typeof generateEmbedding>;
const mockGenerateSearchKeywords = generateSearchKeywords as jest.MockedFunction<typeof generateSearchKeywords>;
const mockGenerateLegalAnswer = generateLegalAnswer as jest.MockedFunction<typeof generateLegalAnswer>;
const mockCountTokens = countTokens as jest.MockedFunction<typeof countTokens>;

describe('Gemini AI Service', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings for text', async () => {
      const mockResult = { embedding: [0.1, 0.2, 0.3], tokenCount: 10 };
      mockGenerateEmbedding.mockResolvedValue(mockResult);

      const text = 'Test legal document';
      const result = await generateEmbedding(text);
      
      expect(result).toEqual(mockResult);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.tokenCount).toBe(10);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith(text);
    });

    it('should handle errors gracefully', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('Failed to generate embedding'));

      await expect(generateEmbedding('test')).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('generateSearchKeywords', () => {
    it('should generate search keywords from query', async () => {
      const mockResult = { keywords: ['刑法', '謀殺', '刑罰', '法律條文', '澳門法律'], tokenCount: 15 };
      mockGenerateSearchKeywords.mockResolvedValue(mockResult);

      const query = 'Maximum penalty for murder';
      const result = await generateSearchKeywords(query);
      
      expect(result).toEqual(mockResult);
      expect(result.keywords).toEqual(['刑法', '謀殺', '刑罰', '法律條文', '澳門法律']);
      expect(result.keywords.length).toBeLessThanOrEqual(5);
      expect(result.tokenCount).toBe(15);
      expect(mockGenerateSearchKeywords).toHaveBeenCalledWith(query);
    });

    it('should handle empty response', async () => {
      const mockResult = { keywords: [], tokenCount: 5 };
      mockGenerateSearchKeywords.mockResolvedValue(mockResult);

      const result = await generateSearchKeywords('test query');
      expect(result.keywords).toEqual([]);
      expect(result.tokenCount).toBe(5);
    });

    it('should filter out empty keywords', async () => {
      const mockResult = { keywords: ['keyword1', 'keyword2', 'keyword3'], tokenCount: 12 };
      mockGenerateSearchKeywords.mockResolvedValue(mockResult);

      const result = await generateSearchKeywords('test query');
      expect(result.keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
      expect(result.tokenCount).toBe(12);
    });

    it('should handle errors gracefully', async () => {
      mockGenerateSearchKeywords.mockRejectedValue(new Error('Failed to generate search keywords'));

      await expect(generateSearchKeywords('test')).rejects.toThrow('Failed to generate search keywords');
    });
  });

  describe('generateLegalAnswer', () => {
    it('should generate legal answer from search results', async () => {
      const mockResult = {
        answer: 'Based on the legal documents, the penalty for murder is life imprisonment.',
        tokenCount: 25
      };
      mockGenerateLegalAnswer.mockResolvedValue(mockResult);

      const question = 'What is the penalty for murder?';
      const searchResults = [
        {
          content: 'Murder is punishable by life imprisonment',
          metadata: { title: 'Criminal Code' },
          similarity: 0.9
        }
      ];

      const result = await generateLegalAnswer(question, searchResults);
      expect(result).toEqual(mockResult);
      expect(typeof result.answer).toBe('string');
      expect(result.answer).toBe('Based on the legal documents, the penalty for murder is life imprisonment.');
      expect(result.tokenCount).toBe(25);
      expect(mockGenerateLegalAnswer).toHaveBeenCalledWith(question, searchResults);
    });

    it('should handle multiple search results', async () => {
      const mockResult = {
        answer: 'Legal analysis based on multiple sources.',
        tokenCount: 30
      };
      mockGenerateLegalAnswer.mockResolvedValue(mockResult);

      const question = 'Legal question';
      const searchResults = [
        {
          content: 'Content 1',
          metadata: { title: 'Law 1' },
          similarity: 0.9
        },
        {
          content: 'Content 2',
          metadata: { title: 'Law 2' },
          similarity: 0.8
        }
      ];

      const result = await generateLegalAnswer(question, searchResults);
      expect(result).toEqual(mockResult);
      expect(typeof result.answer).toBe('string');
      expect(result.answer).toBe('Legal analysis based on multiple sources.');
      expect(result.tokenCount).toBe(30);
      expect(mockGenerateLegalAnswer).toHaveBeenCalledWith(question, searchResults);
    });

    it('should handle errors gracefully', async () => {
      mockGenerateLegalAnswer.mockRejectedValue(new Error('Failed to generate legal answer'));

      const question = 'Test question';
      const searchResults = [{ content: 'test', metadata: {}, similarity: 0.9 }];

      await expect(generateLegalAnswer(question, searchResults)).rejects.toThrow('Failed to generate legal answer');
    });
  });

  describe('countTokens', () => {
    it('should count tokens for English text', () => {
      mockCountTokens.mockReturnValue(9);

      const text = 'This is a test sentence with multiple words.';
      const tokens = countTokens(text);
      expect(tokens).toBe(9);
      expect(typeof tokens).toBe('number');
      expect(mockCountTokens).toHaveBeenCalledWith(text);
    });

    it('should count tokens for Chinese text', () => {
      mockCountTokens.mockReturnValue(12);

      const text = '這是一個測試句子，包含多個中文字符。';
      const tokens = countTokens(text);
      expect(tokens).toBe(12);
      expect(typeof tokens).toBe('number');
      expect(mockCountTokens).toHaveBeenCalledWith(text);
    });

    it('should handle empty text', () => {
      mockCountTokens.mockReturnValue(0);

      const tokens = countTokens('');
      expect(tokens).toBe(0);
      expect(mockCountTokens).toHaveBeenCalledWith('');
    });

    it('should estimate tokens correctly', () => {
      mockCountTokens.mockReturnValueOnce(1).mockReturnValueOnce(15);

      const shortText = 'Hi';
      const longText = 'This is a much longer text that should have more tokens than the short text.';
      
      const shortTokens = countTokens(shortText);
      const longTokens = countTokens(longText);
      
      expect(shortTokens).toBe(1);
      expect(longTokens).toBe(15);
      expect(longTokens).toBeGreaterThan(shortTokens);
    });
  });
});
