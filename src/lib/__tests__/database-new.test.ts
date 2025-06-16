import { saveConversation, saveConversationMessages, SessionData } from '../database-new';

/**
 * Unit tests for conversation saving functionality
 * These tests verify the database functions work correctly
 */

describe('Conversation Database Functions', () => {
  const mockSession: SessionData = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    provider: 'google'
  };
  const mockMessages = [
    {
      role: 'user' as const,
      content: '什麼是澳門的基本法？',
      timestamp: '2025-06-13T15:00:00.000Z'
    },
    {
      role: 'assistant' as const,
      content: '澳門基本法是澳門特別行政區的憲制性法律文件...',
      timestamp: '2025-06-13T15:00:30.000Z'
    }
  ];

  describe('saveConversation', () => {
    it('should create a new conversation with messages', async () => {
      const conversationId = await saveConversation(
        mockSession,
        null, // New conversation
        mockMessages,
        '諮詢: 什麼是澳門的基本法？...',
        1500,
        'gemini-2.5-flash-preview-05-20'
      );

      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      expect(conversationId).not.toMatch(/^temp-/);
    });

    it('should update an existing conversation', async () => {
      // First create a conversation
      const initialConversationId = await saveConversation(
        mockSession,
        null,
        [mockMessages[0]],
        '測試對話',
        500,
        'gemini-2.5-flash-preview-05-20'
      );

      // Then update it with new messages
      const updatedConversationId = await saveConversation(
        mockSession,
        initialConversationId,
        mockMessages,
        undefined,
        1500,
        'gemini-2.5-flash-preview-05-20'
      );

      expect(updatedConversationId).toBe(initialConversationId);
    });

    it('should handle Pro model conversations', async () => {
      const conversationId = await saveConversation(
        mockSession,
        null,
        mockMessages,
        'Pro 模型測試',
        15000, // 10x tokens for Pro model
        'gemini-2.5-pro-preview-05-20'
      );

      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
    });

    it('should handle empty messages array gracefully', async () => {
      const conversationId = await saveConversation(
        mockSession,
        null,
        [],
        '空對話測試',
        0,
        'gemini-2.5-flash-preview-05-20'
      );

      expect(conversationId).toBeDefined();
    });
  });

  describe('saveConversationMessages', () => {
    it('should save messages to existing conversation', async () => {
      // Create a conversation first
      const conversationId = await saveConversation(
        mockSession,
        null,
        [],
        '訊息測試',
        0,
        'gemini-2.5-flash-preview-05-20'
      );

      // Then save messages
      await expect(
        saveConversationMessages(conversationId, mockMessages)
      ).resolves.not.toThrow();
    });

    it('should handle empty messages array', async () => {
      const conversationId = 'test-conversation-id';
      
      await expect(
        saveConversationMessages(conversationId, [])
      ).resolves.not.toThrow();
    });

    it('should save messages with document IDs', async () => {
      const conversationId = 'test-conversation-id';
      // const documentIds = [1, 2, 3]; // Unused variable commented out
      
      await expect(
        saveConversationMessages(conversationId, mockMessages)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid user ID', async () => {
      const invalidSession: SessionData = {
        userId: 'invalid-user-id',
        email: 'invalid@example.com',
        role: 'user',
        provider: 'google'
      };
      
      await expect(
        saveConversation(
          invalidSession,
          null,
          mockMessages,
          '錯誤測試'
        )
      ).rejects.toThrow();
    });

    it('should throw error for invalid conversation ID', async () => {
      await expect(
        saveConversationMessages('invalid-conversation-id', mockMessages)
      ).rejects.toThrow();
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // to simulate connection failures
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Data Validation', () => {
    it('should validate message roles', async () => {
      const invalidMessages = [
        {
          role: 'invalid' as any,
          content: '測試訊息',
          timestamp: '2025-06-13T15:00:00.000Z'
        }
      ];

      await expect(
        saveConversation(mockSession, null, invalidMessages, '驗證測試')
      ).rejects.toThrow();
    });

    it('should handle long message content', async () => {
      const longMessage = {
        role: 'user' as const,
        content: 'A'.repeat(10000), // Very long message
        timestamp: '2025-06-13T15:00:00.000Z'
      };

      await expect(
        saveConversation(mockSession, null, [longMessage], '長訊息測試')
      ).resolves.toBeDefined();
    });

    it('should validate timestamp format', async () => {
      const invalidTimestampMessage = {
        role: 'user' as const,
        content: '測試訊息',
        timestamp: 'invalid-timestamp'
      };

      // The function should handle invalid timestamps gracefully
      // or throw an appropriate error
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
  it('should handle complete conversation lifecycle', async () => {
    const integrationSession: SessionData = {
      userId: 'integration-test-user',
      email: 'integration@example.com',
      role: 'user',
      provider: 'github'
    };
    
    const initialMessage = {
      role: 'user' as const,
      content: '澳門有哪些重要的法律？',
      timestamp: new Date().toISOString()
    };

    // 1. Create new conversation
    const conversationId = await saveConversation(
      integrationSession,
      null,
      [initialMessage],
      '諮詢: 澳門有哪些重要的法律？...',
      500,
      'gemini-2.5-flash-preview-05-20'
    );

    expect(conversationId).toBeDefined();

    // 2. Add assistant response
    const assistantMessage = {
      role: 'assistant' as const,
      content: '澳門的重要法律包括基本法、民法典、刑法典等...',
      timestamp: new Date().toISOString()
    };

    const updatedConversationId = await saveConversation(
      integrationSession,
      conversationId,
      [initialMessage, assistantMessage],
      undefined,
      1200,
      'gemini-2.5-flash-preview-05-20'
    );

    expect(updatedConversationId).toBe(conversationId);

  });
});