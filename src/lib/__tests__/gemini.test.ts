// Mock the entire Gemini module
jest.mock('@google/generative-ai');

import { generateEmbedding, generateSearchKeywords, generateLegalAnswer, countTokens } from '../gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const mockGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;

describe('Gemini AI Service', () => {
  let mockEmbedContent: jest.Mock;
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;

  beforeEach(() => {
    // Set up environment variable
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Clear all mocks
    jest.clearAllMocks();

    // Set up mocks
    mockEmbedContent = jest.fn();
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      embedContent: mockEmbedContent,
      generateContent: mockGenerateContent
    });

    mockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    } as any));
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings for text', async () => {
      mockEmbedContent.mockResolvedValue({
        embedding: { values: [0.1, 0.2, 0.3] }
      });

      const text = 'Test legal document';
      const embedding = await generateEmbedding(text);
      
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
      expect(Array.isArray(embedding)).toBe(true);
      expect(mockEmbedContent).toHaveBeenCalledWith(text);
    });

    it('should handle errors gracefully', async () => {
      mockEmbedContent.mockRejectedValue(new Error('API Error'));

      await expect(generateEmbedding('test')).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('generateSearchKeywords', () => {
    it('should generate search keywords from query', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '刑法\n謀殺\n刑罰\n法律條文\n澳門法律'
        }
      });

      const query = 'Maximum penalty for murder';
      const keywords = await generateSearchKeywords(query);
      
      expect(keywords).toEqual(['刑法', '謀殺', '刑罰', '法律條文', '澳門法律']);
      expect(keywords.length).toBeLessThanOrEqual(5);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle empty response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => ''
        }
      });

      const keywords = await generateSearchKeywords('test query');
      expect(keywords).toEqual([]);
    });

    it('should filter out empty keywords', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'keyword1\n\nkeyword2\n   \nkeyword3'
        }
      });

      const keywords = await generateSearchKeywords('test query');
      expect(keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
    });

    it('should handle errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(generateSearchKeywords('test')).rejects.toThrow('Failed to generate search keywords');
    });
  });

  describe('generateLegalAnswer', () => {
    it('should generate legal answer from search results', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Based on the legal documents, the penalty for murder is life imprisonment.'
        }
      });

      const question = 'What is the penalty for murder?';
      const searchResults = [
        {
          content: 'Murder is punishable by life imprisonment',
          metadata: { title: 'Criminal Code' },
          similarity: 0.9
        }
      ];

      const answer = await generateLegalAnswer(question, searchResults);
      expect(typeof answer).toBe('string');
      expect(answer).toBe('Based on the legal documents, the penalty for murder is life imprisonment.');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle multiple search results', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Legal analysis based on multiple sources.'
        }
      });

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

      const answer = await generateLegalAnswer(question, searchResults);
      expect(typeof answer).toBe('string');
      expect(answer).toBe('Legal analysis based on multiple sources.');
    });

    it('should handle errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const question = 'Test question';
      const searchResults = [{ content: 'test', metadata: {}, similarity: 0.9 }];

      await expect(generateLegalAnswer(question, searchResults)).rejects.toThrow('Failed to generate legal answer');
    });
  });

  describe('countTokens', () => {
    it('should count tokens for English text', () => {
      const text = 'This is a test sentence with multiple words.';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should count tokens for Chinese text', () => {
      const text = '這是一個測試句子，包含多個中文字符。';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should handle empty text', () => {
      const tokens = countTokens('');
      expect(tokens).toBe(0);
    });

    it('should estimate tokens correctly', () => {
      const shortText = 'Hi';
      const longText = 'This is a much longer text that should have more tokens than the short text.';
      
      expect(countTokens(longText)).toBeGreaterThan(countTokens(shortText));
    });
  });
});
