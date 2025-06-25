// import { saveConversation, saveConversationMessages, SessionData } from '../database-new';
import { saveConversation, SessionData } from '../database-new';
import { db } from '@/lib/db';

/**
 * Unit tests for conversation saving functionality
 * These tests verify the database functions work correctly
 */

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Conversation Database Functions', () => {
  const mockSession = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'free',
    provider: 'google',
  };

  const mockMessage = {
    role: 'user' as const,
    content: 'Test message',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveConversation', () => {
    it('should create a new conversation with messages', async () => {
      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      const result = await saveConversation(mockSession, null, [mockMessage], 'Test Conversation');

      expect(result).toBeDefined();
      expect(result).toBe('conv-123');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should update an existing conversation', async () => {
      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: 'Updated Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      const result = await saveConversation(mockSession, 'conv-123', [mockMessage], 'Updated Conversation');

      expect(result).toBeDefined();
      expect(result).toBe('conv-123');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle Pro model conversations', async () => {
      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: 'Pro Conversation',
        model: 'pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      const result = await saveConversation(mockSession, null, [mockMessage], 'Pro Conversation', 'pro');

      expect(result).toBeDefined();
      expect(result).toBe('conv-123');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle empty messages array gracefully', async () => {
      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: 'Empty Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      const result = await saveConversation(mockSession, null, [], 'Empty Conversation');

      expect(result).toBeDefined();
      expect(result).toBe('conv-123');
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  // describe('saveConversationMessages', () => {
  //   it('should save messages to existing conversation', async () => {
  //     // Create a conversation first
  //     const conversationId = await saveConversation(
  //       mockSession,
  //       null,
  //       [],
  //       '訊息測試',
  //       0,
  //       'gemini-2.5-flash-preview-05-20'
  //     );

  //     // Then save messages
  //     await expect(
  //       saveConversationMessages(conversationId, mockMessages)
  //     ).resolves.not.toThrow();
  //   });

  //   it('should handle empty messages array', async () => {
  //     const conversationId = 'test-conversation-id';
      
  //     await expect(
  //       saveConversationMessages(conversationId, [])
  //     ).resolves.not.toThrow();
  //   });

  //   it('should save messages with document IDs', async () => {
  //     const conversationId = 'test-conversation-id';
  //     // const documentIds = [1, 2, 3]; // Unused variable commented out
      
  //     await expect(
  //       saveConversationMessages(conversationId, mockMessages)
  //     ).resolves.not.toThrow();
  //   });
  // });

  describe('Error Handling', () => {
    it('should throw error for invalid user ID', async () => {
      const invalidSession = { ...mockSession, userId: '' };

      await expect(
        saveConversation(invalidSession, null, [mockMessage], 'Test Conversation')
      ).rejects.toThrow('Invalid user ID');
    });

    // it('should throw error for invalid conversation ID', async () => {
    //   await expect(
    //     saveConversationMessages('invalid-conversation-id', mockMessages)
    //   ).rejects.toThrow();
    // });

    it('should handle database connection errors gracefully', async () => {
      mockDb.transaction.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        saveConversation(mockSession, null, [mockMessage], 'Test Conversation')
      ).rejects.toThrow('Failed to save conversation');
    });
  });

  describe('Data Validation', () => {
    it('should validate message roles', async () => {
      const invalidMessage = {
        role: 'invalid-role' as any,
        content: 'Test message',
        timestamp: new Date().toISOString(),
      };

      await expect(
        saveConversation(mockSession, null, [invalidMessage], 'Test Conversation')
      ).rejects.toThrow('Invalid message role');
    });

    it('should handle long message content', async () => {
      const longMessage = {
        role: 'user' as const,
        content: 'a'.repeat(10000),
        timestamp: new Date().toISOString(),
      };

      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: '長訊息測試',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      await expect(
        saveConversation(mockSession, null, [longMessage], '長訊息測試')
      ).resolves.toBeDefined();
    });

    it('should validate timestamp format', async () => {
      const invalidTimestampMessage = {
        role: 'user' as const,
        content: 'Test message',
        timestamp: 'invalid-timestamp',
      };

      const mockResult = {
        id: 'conv-123',
        user_id: mockSession.userId,
        title: '時間戳測試',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
        } as any);
      });

      await expect(
        saveConversation(mockSession, null, [invalidTimestampMessage], '時間戳測試')
      ).resolves.toBeDefined();
    });
  });
});

/**
 * Integration tests for the complete conversation flow
 */
describe('Conversation Integration Tests', () => {
  const mockSession = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'free',
    provider: 'google',
  };

  const mockMessage = {
    role: 'user' as const,
    content: 'Test message',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle complete conversation lifecycle', async () => {
    const mockResult = {
      id: 'conv-123',
      user_id: mockSession.userId,
      title: 'Test Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockDb.transaction.mockImplementation(async (callback) => {
      return callback({
        query: jest.fn().mockResolvedValue({ rows: [mockResult] }),
      } as any);
    });

    // Create conversation
    const conversationId = await saveConversation(mockSession, null, [mockMessage], 'Test Conversation');
    expect(conversationId).toBeDefined();
    expect(conversationId).toBe('conv-123');

    // Update conversation
    const updatedMessage = {
      ...mockMessage,
      content: 'Updated message',
    };

    const updatedConversationId = await saveConversation(
      mockSession,
      conversationId,
      [updatedMessage],
      'Updated Conversation'
    );

    expect(updatedConversationId).toBeDefined();
    expect(updatedConversationId).toBe('conv-123');
  });
});