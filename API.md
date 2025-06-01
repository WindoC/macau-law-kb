# API Documentation

This document provides comprehensive information about all API endpoints in the Macau Law Knowledge Base application.

## Base URL

All API endpoints are relative to the base URL: `https://your-domain.com/api`

## Authentication

Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## CSRF Protection

State-changing operations (POST, PUT, DELETE) require a CSRF token in the `X-CSRF-Token` header.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Authentication Endpoints

### Get CSRF Token
- **Method**: `GET`
- **URL**: `/api/auth/csrf`
- **Description**: Retrieve a CSRF token for subsequent requests
- **Authentication**: None required

**Response:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Initiate OAuth Login
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Description**: Start OAuth authentication flow
- **Authentication**: None required

**Request Body:**
```json
{
  "provider": "google" | "github"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redirectUrl": "https://oauth-provider.com/auth?..."
  }
}
```

### Handle OAuth Callback
- **Method**: `GET`
- **URL**: `/api/auth/callback`
- **Description**: Process OAuth callback and create user session
- **Authentication**: None required
- **Query Parameters**: OAuth provider parameters

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "free"
    },
    "token": "jwt_token"
  }
}
```

### User Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Description**: Invalidate user session
- **Authentication**: Required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Legal Search Endpoints

### Perform Legal Search
- **Method**: `POST`
- **URL**: `/api/search`
- **Description**: Search legal documents using AI-powered vector search
- **Authentication**: Required

**Request Body:**
```json
{
  "query": "Maximum penalty for murder",
  "limit": 10,
  "filter": {
    "category": "criminal_law"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 123,
        "content": "Document content...",
        "metadata": {
          "law_id": "uuid",
          "title": "Criminal Code",
          "section": "Article 123"
        },
        "similarity": 0.85
      }
    ],
    "tokensUsed": 25,
    "searchId": "uuid"
  }
}
```

### Get Search History
- **Method**: `GET`
- **URL**: `/api/search/history`
- **Description**: Retrieve user's search history
- **Authentication**: Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "searches": [
      {
        "id": "uuid",
        "query": "Maximum penalty for murder",
        "resultsCount": 5,
        "tokensUsed": 25,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### Get Search Suggestions
- **Method**: `GET`
- **URL**: `/api/search/suggestions`
- **Description**: Get search suggestions based on popular queries
- **Authentication**: Required

**Query Parameters:**
- `q` (optional): Partial query for autocomplete

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "Maximum penalty for murder",
      "Property rights in Macau",
      "Employment law regulations"
    ]
  }
}
```

## Legal Q&A Endpoints

### Submit Question
- **Method**: `POST`
- **URL**: `/api/qa`
- **Description**: Submit a legal question and get AI-generated answer
- **Authentication**: Required

**Request Body:**
```json
{
  "question": "What is the maximum penalty for murder in Macau?",
  "context": {
    "category": "criminal_law"
  }
}
```

**Response (Streaming):**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the legal documents...",
    "sourceDocuments": [
      {
        "id": 123,
        "title": "Criminal Code",
        "section": "Article 123"
      }
    ],
    "tokensUsed": 150,
    "qaId": "uuid"
  }
}
```

### Get Q&A History
- **Method**: `GET`
- **URL**: `/api/qa/history`
- **Description**: Retrieve user's Q&A history
- **Authentication**: Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "qaHistory": [
      {
        "id": "uuid",
        "question": "What is the maximum penalty for murder?",
        "answer": "Based on the legal documents...",
        "sourceDocuments": [...],
        "tokensUsed": 150,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "totalPages": 2
    }
  }
}
```

## Legal Consultant Endpoints

### Create New Conversation
- **Method**: `POST`
- **URL**: `/api/consultant/conversations`
- **Description**: Start a new consultation conversation
- **Authentication**: Required

**Request Body:**
```json
{
  "title": "Property Law Consultation",
  "model": "gemini-2.5-flash-preview-05-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "uuid",
      "title": "Property Law Consultation",
      "model": "gemini-2.5-flash-preview-05-20",
      "totalTokensUsed": 0,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Get User Conversations
- **Method**: `GET`
- **URL**: `/api/consultant/conversations`
- **Description**: List user's consultation conversations
- **Authentication**: Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Property Law Consultation",
        "model": "gemini-2.5-flash-preview-05-20",
        "totalTokensUsed": 250,
        "messageCount": 8,
        "lastMessageAt": "2024-01-01T14:30:00Z",
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Send Message in Conversation
- **Method**: `POST`
- **URL**: `/api/consultant/chat`
- **Description**: Send a message in a consultation conversation
- **Authentication**: Required

**Request Body:**
```json
{
  "conversationId": "uuid",
  "message": "Can you explain property rights in Macau?",
  "model": "gemini-2.5-flash-preview-05-20"
}
```

**Response (Streaming):**
```json
{
  "success": true,
  "data": {
    "messageId": "uuid",
    "response": "Property rights in Macau are governed by...",
    "sourceDocuments": [...],
    "tokensUsed": 180
  }
}
```

### Get Conversation Messages
- **Method**: `GET`
- **URL**: `/api/consultant/conversations/:id/messages`
- **Description**: Retrieve messages from a specific conversation
- **Authentication**: Required

**URL Parameters:**
- `id`: Conversation ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Can you explain property rights?",
        "tokensUsed": 0,
        "createdAt": "2024-01-01T12:00:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Property rights in Macau...",
        "sourceDocuments": [...],
        "tokensUsed": 180,
        "createdAt": "2024-01-01T12:01:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

## User Management Endpoints

### Get User Profile
- **Method**: `GET`
- **URL**: `/api/user/profile`
- **Description**: Retrieve current user's profile information
- **Authentication**: Required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatarUrl": "https://...",
      "role": "free",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Update User Profile
- **Method**: `PUT`
- **URL**: `/api/user/profile`
- **Description**: Update user profile information
- **Authentication**: Required

**Request Body:**
```json
{
  "name": "Updated Name",
  "avatarUrl": "https://new-avatar-url.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Updated Name",
      "avatarUrl": "https://new-avatar-url.com",
      "role": "free",
      "updatedAt": "2024-01-01T13:00:00Z"
    }
  }
}
```

### Get User Credits
- **Method**: `GET`
- **URL**: `/api/user/credits`
- **Description**: Get user's token credit information
- **Authentication**: Required

**Response:**
```json
{
  "success": true,
  "data": {
    "credits": {
      "totalTokens": 1000,
      "usedTokens": 250,
      "remainingTokens": 750,
      "lastReset": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Get User Usage Statistics
- **Method**: `GET`
- **URL**: `/api/user/usage`
- **Description**: Get detailed usage statistics for the user
- **Authentication**: Required

**Query Parameters:**
- `period` (optional): 'day', 'week', 'month', 'year' (default: 'month')

**Response:**
```json
{
  "success": true,
  "data": {
    "usage": {
      "period": "month",
      "totalTokensUsed": 250,
      "searchTokens": 75,
      "qaTokens": 100,
      "consultantTokens": 75,
      "searchCount": 15,
      "qaCount": 8,
      "conversationCount": 3,
      "dailyBreakdown": [
        {
          "date": "2024-01-01",
          "tokens": 25,
          "searches": 3,
          "qa": 1,
          "conversations": 0
        }
      ]
    }
  }
}
```

## Admin Endpoints

### List All Users
- **Method**: `GET`
- **URL**: `/api/admin/users`
- **Description**: Get list of all users (admin only)
- **Authentication**: Required (Admin role)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Users per page (default: 50)
- `role` (optional): Filter by user role
- `search` (optional): Search by email or name

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "User Name",
        "role": "free",
        "totalTokensUsed": 250,
        "lastActive": "2024-01-01T12:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### Update User Role
- **Method**: `PUT`
- **URL**: `/api/admin/users/:id/role`
- **Description**: Update a user's role (admin only)
- **Authentication**: Required (Admin role)

**URL Parameters:**
- `id`: User ID

**Request Body:**
```json
{
  "role": "pay",
  "reason": "User upgraded to paid plan"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "pay",
      "updatedAt": "2024-01-01T13:00:00Z"
    }
  }
}
```

### Get System Statistics
- **Method**: `GET`
- **URL**: `/api/admin/statistics`
- **Description**: Get system-wide usage statistics (admin only)
- **Authentication**: Required (Admin role)

**Query Parameters:**
- `period` (optional): 'day', 'week', 'month', 'year' (default: 'month')

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "period": "month",
      "totalUsers": 150,
      "activeUsers": 75,
      "newUsers": 25,
      "totalTokensUsed": 50000,
      "totalSearches": 1200,
      "totalQA": 800,
      "totalConversations": 300,
      "usersByRole": {
        "free": 120,
        "pay": 25,
        "vip": 4,
        "admin": 1
      },
      "dailyStats": [
        {
          "date": "2024-01-01",
          "activeUsers": 45,
          "tokensUsed": 2500,
          "searches": 80,
          "qa": 50,
          "conversations": 20
        }
      ]
    }
  }
}
```

### Get Admin Action Logs
- **Method**: `GET`
- **URL**: `/api/admin/logs`
- **Description**: Get audit logs of admin actions (admin only)
- **Authentication**: Required (Admin role)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Logs per page (default: 50)
- `action` (optional): Filter by action type
- `adminId` (optional): Filter by admin user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "adminUser": {
          "id": "uuid",
          "email": "admin@example.com",
          "name": "Admin User"
        },
        "action": "UPDATE_USER_ROLE",
        "targetUser": {
          "id": "uuid",
          "email": "user@example.com"
        },
        "details": {
          "oldRole": "free",
          "newRole": "pay",
          "reason": "User upgraded to paid plan"
        },
        "createdAt": "2024-01-01T13:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "totalPages": 4
    }
  }
}
```

## Law Document Endpoints

### Get Law Document
- **Method**: `GET`
- **URL**: `/api/law/:id`
- **Description**: Retrieve a complete law document
- **Authentication**: Required

**URL Parameters:**
- `id`: Law document ID

**Response:**
```json
{
  "success": true,
  "data": {
    "law": {
      "id": "uuid",
      "title": "Criminal Code of Macau",
      "content": "Full legal document content...",
      "lawNumber": "Law No. 6/2017",
      "category": "criminal_law",
      "effectiveDate": "2017-12-01",
      "status": "active",
      "createdAt": "2017-12-01T00:00:00Z",
      "updatedAt": "2017-12-01T00:00:00Z"
    }
  }
}
```

### Search Law Documents
- **Method**: `GET`
- **URL**: `/api/law/search`
- **Description**: Search law documents by title or content
- **Authentication**: Required

**Query Parameters:**
- `q`: Search query
- `category` (optional): Filter by category
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "laws": [
      {
        "id": "uuid",
        "title": "Criminal Code of Macau",
        "lawNumber": "Law No. 6/2017",
        "category": "criminal_law",
        "effectiveDate": "2017-12-01",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `INVALID_INPUT` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Too many requests |
| `INSUFFICIENT_TOKENS` | Not enough tokens for operation |
| `INVALID_CSRF_TOKEN` | CSRF token validation failed |
| `SERVER_ERROR` | Internal server error |
| `AI_SERVICE_ERROR` | AI service unavailable |
| `DATABASE_ERROR` | Database operation failed |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 10 requests per minute
- **Search endpoints**: 30 requests per minute
- **Q&A endpoints**: 20 requests per minute
- **Consultant endpoints**: 15 requests per minute
- **Admin endpoints**: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Streaming Responses

Some endpoints support streaming responses for real-time AI interactions:

- `/api/qa` - Streams AI-generated answers
- `/api/consultant/chat` - Streams conversation responses

Streaming responses use Server-Sent Events (SSE) format:

```
data: {"type": "start", "message": "Generating response..."}

data: {"type": "content", "content": "Based on the legal documents"}

data: {"type": "content", "content": ", the maximum penalty for murder"}

data: {"type": "end", "tokensUsed": 150, "sourceDocuments": [...]}
```

## Webhook Support

The system supports webhooks for real-time notifications:

### User Events
- `user.created` - New user registration
- `user.role_changed` - User role updated
- `user.tokens_depleted` - User ran out of tokens

### System Events
- `system.high_usage` - System usage threshold exceeded
- `system.error` - Critical system error

Webhook payloads include event type, timestamp, and relevant data.

This API documentation provides comprehensive coverage of all endpoints and their usage patterns for the Macau Law Knowledge Base application.
