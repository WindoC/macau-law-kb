/**
 * Database Service Tests
 * Tests for application-level database operations including user management,
 * document search, conversation handling, and token management
 */

import * as dbService from '../src/lib/database-new';
import { db } from '../src/lib/db';

// Mock the database connection
jest.mock('../src/lib/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('Database Service', () => {
  const mockSession = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'free',
    provider: 'google',
  };

  const mockMessages = [
    {
      role: 'user' as const,
      content: 'Hello',
      documents_ids: [1, 2],
      tokens_used: 50,
      timestamp: '2023-01-01T00:00:00Z',
    },
    {
      role: 'assistant' as const,
      content: 'Hi there!',
      documents_ids: [3],
      tokens_used: 30,
      timestamp: '2023-01-01T00:01:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Search', () => {
    test('should search documents using vector similarity', async () => {
      const mockDocuments = [
        {
          id: 1,
          content: 'Legal document content 1',
          metadata: { title: 'Document 1' },
          similarity: 0.85,
        },
        {
          id: 2,
          content: 'Legal document content 2',
          metadata: { title: 'Document 2' },
          similarity: 0.78,
        },
      ];

      mockDb.query.mockResolvedValue(mockDocuments);

      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const results = await dbService.searchDocuments(embedding, 5, {});

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM match_documents($1, $2, $3)',
        [embedding, 5, {}]
      );
      expect(results).toEqual(mockDocuments);
    });

    test('should handle search errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const embedding = [0.1, 0.2, 0.3];
      
      await expect(dbService.searchDocuments(embedding, 5, {}))
        .rejects.toThrow('Failed to search documents');
    });

    test('should use default parameters', async () => {
      mockDb.query.mockResolvedValue([]);

      const embedding = [0.1, 0.2, 0.3];
      await dbService.searchDocuments(embedding);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM match_documents($1, $2, $3)',
        [embedding, 10, {}]
      );
    });
  });

  describe('Search History', () => {
    test('should save search history successfully', async () => {
      const mockResult = { id: 'search-history-id' };
      mockDb.query.mockResolvedValue([mockResult]);

      const historyId = await dbService.saveSearchHistory(
        mockSession,
        'legal query',
        [1, 2, 3],
        150
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        `INSERT INTO search_history (user_id, query, document_ids, tokens_used, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [mockSession.userId, 'legal query', [1, 2, 3], 150]
      );
      expect(historyId).toBe('search-history-id');
    });

    test('should handle search history save errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        dbService.saveSearchHistory(mockSession, 'query', [1], 100)
      ).rejects.toThrow('Failed to save search history');
    });
  });

  describe('Q&A History', () => {
    test('should save Q&A history successfully', async () => {
      const mockResult = { id: 'qa-history-id' };
      mockDb.query.mockResolvedValue([mockResult]);

      const historyId = await dbService.saveQAHistory(
        mockSession,
        'What is the law about X?',
        'According to Article Y...',
        [1, 2],
        200
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        `INSERT INTO qa_history (user_id, question, answer, document_ids, tokens_used, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [mockSession.userId, 'What is the law about X?', 'According to Article Y...', [1, 2], 200]
      );
      expect(historyId).toBe('qa-history-id');
    });

    test('should handle Q&A history save errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        dbService.saveQAHistory(mockSession, 'question', 'answer', [1], 100)
      ).rejects.toThrow('Failed to save Q&A history');
    });
  });

  // describe('Conversation Management', () => {
  //   test('should save conversation messages successfully', async () => {
  //     mockDb.query.mockResolvedValue([]);

  //     await dbService.saveConversationMessages('conversation-id', mockMessages);

  //     expect(mockDb.query).toHaveBeenCalledWith(
  //       expect.stringContaining('INSERT INTO consultant_messages'),
  //       expect.arrayContaining([
  //         'conversation-id',
  //         'user',
  //         'Hello',
  //         [1, 2],
  //         50,
  //         '2023-01-01T00:00:00Z',
  //         'conversation-id',
  //         'assistant',
  //         'Hi there!',
  //         [3],
  //         30,
  //         '2023-01-01T00:01:00Z',
  //       ])
  //     );
  //   });

  //   test('should handle empty messages array', async () => {
  //     await dbService.saveConversationMessages('conversation-id', []);

  //     expect(mockDb.query).not.toHaveBeenCalled();
  //   });

    // test('should limit messages to last 2', async () => {
    //   const manyMessages = [
    //     { role: 'user' as const, content: 'Message 1', timestamp: '2023-01-01T00:00:00Z' },
    //     { role: 'assistant' as const, content: 'Message 2', timestamp: '2023-01-01T00:01:00Z' },
    //     { role: 'user' as const, content: 'Message 3', timestamp: '2023-01-01T00:02:00Z' },
    //     { role: 'assistant' as const, content: 'Message 4', timestamp: '2023-01-01T00:03:00Z' },
    //   ];

    //   mockDb.query.mockResolvedValue([]);

    //   await dbService.saveConversationMessages('conversation-id', manyMessages);

    //   // Should only save the last 2 messages
    //   expect(mockDb.query).toHaveBeenCalledWith(
    //     expect.stringContaining('INSERT INTO consultant_messages'),
    //     expect.arrayContaining(['Message 3', 'Message 4'])
    //   );
    // });

  //   test('should save new conversation successfully', async () => {
  //     const mockConversationId = 'new-conversation-id';
      
  //     mockDb.transaction.mockImplementation(async (callback: any) => {
  //       const mockClient = {
  //         query: jest.fn().mockResolvedValue({
  //           rows: [{ id: mockConversationId }],
  //         }),
  //       };
  //       return callback(mockClient);
  //     });

  //     const conversationId = await dbService.saveConversation(
  //       mockSession,
  //       null, // New conversation
  //       mockMessages,
  //       'Test Conversation',
  //       100,
  //       'gemini-2.5-flash'
  //     );

  //     expect(mockDb.transaction).toHaveBeenCalled();
  //     expect(conversationId).toBe(mockConversationId);
  //   });

  //   test('should update existing conversation successfully', async () => {
  //     const existingConversationId = 'existing-conversation-id';
      
  //     mockDb.transaction.mockImplementation(async (callback: any) => {
  //       const mockClient = {
  //         query: jest.fn().mockResolvedValue({
  //           rows: [{ id: existingConversationId }],
  //         }),
  //       };
  //       return callback(mockClient);
  //     });

  //     const conversationId = await dbService.saveConversation(
  //       mockSession,
  //       existingConversationId,
  //       mockMessages,
  //       undefined,
  //       150,
  //       'gemini-2.5-pro'
  //     );

  //     expect(conversationId).toBe(existingConversationId);
  //   });

  //   test('should handle conversation not found error', async () => {
  //     mockDb.transaction.mockImplementation(async (callback: any) => {
  //       const mockClient = {
  //         query: jest.fn().mockResolvedValue({ rows: [] }), // No conversation found
  //       };
  //       return callback(mockClient);
  //     });

  //     await expect(
  //       dbService.saveConversation(mockSession, 'non-existent-id', mockMessages)
  //     ).rejects.toThrow('Conversation not found or access denied');
  //   });
  // });

  describe('User Profile Management', () => {
    test('should get user profile with credits successfully', async () => {
      const mockUserProfile = {
        id: mockSession.userId,
        email: mockSession.email,
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'free',
        provider: 'google',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        total_tokens: 1000,
        used_tokens: 250,
        remaining_tokens: 750,
        last_reset: '2023-01-01T00:00:00Z',
      };

      mockDb.query.mockResolvedValue([mockUserProfile]);

      const profile = await dbService.getUserProfile(mockSession);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT u.id, u.email, u.name'),
        [mockSession.userId]
      );
      expect(profile).toEqual(mockUserProfile);
    });

    test('should handle user not found', async () => {
      mockDb.query.mockResolvedValue([]);

      await expect(dbService.getUserProfile(mockSession))
        .rejects.toThrow('Failed to get user profile');
    });
  });

  describe('Token Management', () => {
    test('should update token usage successfully', async () => {
      const mockResult = { remaining_tokens: 750 };
      mockDb.query.mockResolvedValue([mockResult]);

      await dbService.updateTokenUsage(mockSession, 100);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_credits'),
        [100, mockSession.userId]
      );
    });

    test('should handle insufficient tokens', async () => {
      const mockResult = { remaining_tokens: -50 };
      mockDb.query.mockResolvedValue([mockResult]);

      await expect(dbService.updateTokenUsage(mockSession, 100))
        .rejects.toThrow('Failed to update token usage');
    });

    test('should handle user credits not found', async () => {
      mockDb.query.mockResolvedValue([]);

      await expect(dbService.updateTokenUsage(mockSession, 100))
        .rejects.toThrow('Failed to update token usage');
    });

    test('should check token availability successfully', async () => {
      const mockResult = { remaining_tokens: 500 };
      mockDb.query.mockResolvedValue([mockResult]);

      const hasTokens = await dbService.checkTokenAvailability(mockSession, 100);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT remaining_tokens FROM user_credits WHERE user_id = $1',
        [mockSession.userId]
      );
      expect(hasTokens).toBe(true);
    });

    test('should return false for insufficient tokens', async () => {
      const mockResult = { remaining_tokens: 50 };
      mockDb.query.mockResolvedValue([mockResult]);

      const hasTokens = await dbService.checkTokenAvailability(mockSession, 100);

      expect(hasTokens).toBe(false);
    });

    test('should return false when user credits not found', async () => {
      mockDb.query.mockResolvedValue([]);

      const hasTokens = await dbService.checkTokenAvailability(mockSession, 100);

      expect(hasTokens).toBe(false);
    });

    test('should handle token check errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const hasTokens = await dbService.checkTokenAvailability(mockSession, 100);

      expect(hasTokens).toBe(false);
    });
  });

  describe('Law Document Retrieval', () => {
    test('should get law document by ID successfully', async () => {
      const mockDocument = {
        id: 'law-123',
        title: 'Test Law',
        content: 'Law content...',
        category: 'civil',
      };

      mockDb.query.mockResolvedValue([mockDocument]);

      const document = await dbService.getLawDocument('law-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM law WHERE id = $1',
        ['law-123']
      );
      expect(document).toEqual(mockDocument);
    });

    test('should handle law document not found', async () => {
      mockDb.query.mockResolvedValue([]);

      await expect(dbService.getLawDocument('non-existent-id'))
        .rejects.toThrow('Failed to get law document');
    });

    test('should handle law document retrieval errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(dbService.getLawDocument('law-123'))
        .rejects.toThrow('Failed to get law document');
    });
  });

  describe('Error Handling', () => {
    test('should log errors appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDb.query.mockRejectedValue(new Error('Test error'));

      await expect(dbService.searchDocuments([0.1, 0.2]))
        .rejects.toThrow('Failed to search documents');

      expect(consoleSpy).toHaveBeenCalledWith('Vector search error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle transaction errors in conversation save', async () => {
      mockDb.transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        dbService.saveConversation(mockSession, null, mockMessages)
      ).rejects.toThrow('Transaction failed');
    });

    // test('should handle message save errors', async () => {
    //   mockDb.query.mockRejectedValue(new Error('Insert failed'));

    //   await expect(
    //     dbService.saveConversationMessages('conversation-id', mockMessages)
    //   ).rejects.toThrow('Failed to save conversation messages');
    // });
  });

  // describe('Data Validation', () => {
  //   test('should handle null/undefined message arrays', async () => {
  //     await dbService.saveConversationMessages('conversation-id', null as any);
  //     expect(mockDb.query).not.toHaveBeenCalled();

  //     await dbService.saveConversationMessages('conversation-id', undefined as any);
  //     expect(mockDb.query).not.toHaveBeenCalled();
  //   });

  //   test('should handle messages with missing optional fields', async () => {
  //     const minimalMessages = [
  //       {
  //         role: 'user' as const,
  //         content: 'Hello',
  //         timestamp: '2023-01-01T00:00:00Z',
  //       },
  //     ];

  //     mockDb.query.mockResolvedValue([]);

  //     await dbService.saveConversationMessages('conversation-id', minimalMessages);

  //     expect(mockDb.query).toHaveBeenCalledWith(
  //       expect.stringContaining('INSERT INTO consultant_messages'),
  //       expect.arrayContaining([
  //         'conversation-id',
  //         'user',
  //         'Hello',
  //         null, // documents_ids should be null
  //         0,    // tokens_used should be 0
  //         '2023-01-01T00:00:00Z',
  //       ])
  //     );
  //   });
  // });
});