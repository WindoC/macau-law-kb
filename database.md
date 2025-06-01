# Database Documentation

This document provides comprehensive information about the database schema and setup for the Macau Law Knowledge Base application.

## Database Tables Overview

### Core Tables

#### `documents` (Vector Search Table)
- **Purpose**: Stores legal document chunks with vector embeddings for AI-powered search
- **Columns**:
  - `id` (bigserial, PRIMARY KEY): Unique identifier for each document chunk
  - `content` (text): The actual text content of the document chunk
  - `metadata` (jsonb): Additional information about the document (law_id, title, section, etc.)
  - `embedding` (vector(3072)): Vector embedding for similarity search using Gemini embeddings

#### `users`
- **Purpose**: User account information and authentication data
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Unique user identifier
  - `email` (text, UNIQUE, NOT NULL): User's email address
  - `name` (text): User's display name
  - `avatar_url` (text): URL to user's profile picture
  - `role` (user_role, NOT NULL, DEFAULT 'free'): User's permission level
  - `created_at` (timestamptz, DEFAULT now()): Account creation timestamp
  - `updated_at` (timestamptz, DEFAULT now()): Last profile update timestamp

#### `user_sessions`
- **Purpose**: Manages user authentication sessions
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Session identifier
  - `user_id` (uuid, FOREIGN KEY → users.id): Reference to user
  - `access_token` (text, NOT NULL): JWT access token
  - `refresh_token` (text): OAuth refresh token
  - `expires_at` (timestamptz, NOT NULL): Token expiration time
  - `created_at` (timestamptz, DEFAULT now()): Session creation time

#### `user_credits`
- **Purpose**: Tracks user token usage and credits
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Credit record identifier
  - `user_id` (uuid, FOREIGN KEY → users.id): Reference to user
  - `total_tokens` (integer, DEFAULT 0): Total tokens allocated
  - `used_tokens` (integer, DEFAULT 0): Tokens consumed
  - `remaining_tokens` (integer, DEFAULT 0): Available tokens
  - `last_reset` (timestamptz, DEFAULT now()): Last credit reset date
  - `created_at` (timestamptz, DEFAULT now()): Record creation time
  - `updated_at` (timestamptz, DEFAULT now()): Last update time

### History Tables

#### `search_history`
- **Purpose**: Records all legal search queries and results
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Search record identifier
  - `user_id` (uuid, FOREIGN KEY → users.id): User who performed search
  - `query` (text, NOT NULL): Original search query
  - `results` (jsonb): Search results with document IDs and similarity scores
  - `tokens_used` (integer, DEFAULT 0): Tokens consumed for this search
  - `created_at` (timestamptz, DEFAULT now()): Search timestamp

#### `qa_history`
- **Purpose**: Stores Q&A interactions and AI responses
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Q&A record identifier
  - `user_id` (uuid, FOREIGN KEY → users.id): User who asked question
  - `question` (text, NOT NULL): Original question
  - `answer` (text, NOT NULL): AI-generated answer
  - `source_documents` (jsonb): Referenced document IDs
  - `tokens_used` (integer, DEFAULT 0): Tokens consumed
  - `created_at` (timestamptz, DEFAULT now()): Question timestamp

#### `consultant_conversations`
- **Purpose**: Manages chat conversations with AI consultant
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Conversation identifier
  - `user_id` (uuid, FOREIGN KEY → users.id): Conversation owner
  - `title` (text): Conversation title/summary
  - `model_used` (text, DEFAULT 'gemini-2.5-flash-preview-05-20'): AI model used
  - `total_tokens_used` (integer, DEFAULT 0): Total tokens for conversation
  - `created_at` (timestamptz, DEFAULT now()): Conversation start time
  - `updated_at` (timestamptz, DEFAULT now()): Last message time

#### `consultant_messages`
- **Purpose**: Individual messages within consultant conversations
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Message identifier
  - `conversation_id` (uuid, FOREIGN KEY → consultant_conversations.id): Parent conversation
  - `role` (message_role, NOT NULL): 'user' or 'assistant'
  - `content` (text, NOT NULL): Message content
  - `source_documents` (jsonb): Referenced documents (for assistant messages)
  - `tokens_used` (integer, DEFAULT 0): Tokens for this message
  - `created_at` (timestamptz, DEFAULT now()): Message timestamp

### Legal Content Tables

#### `law`
- **Purpose**: Complete legal documents and laws
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Law document identifier
  - `title` (text, NOT NULL): Official law title
  - `content` (text, NOT NULL): Full legal document text
  - `law_number` (text): Official law number/reference
  - `category` (text): Legal category classification
  - `effective_date` (date): When law became effective
  - `status` (text, DEFAULT 'active'): Current status of the law
  - `created_at` (timestamptz, DEFAULT now()): Record creation time
  - `updated_at` (timestamptz, DEFAULT now()): Last modification time

### Administrative Tables

#### `admin_logs`
- **Purpose**: Audit trail for administrative actions
- **Columns**:
  - `id` (uuid, PRIMARY KEY): Log entry identifier
  - `admin_user_id` (uuid, FOREIGN KEY → users.id): Administrator who performed action
  - `action` (text, NOT NULL): Description of action performed
  - `target_user_id` (uuid, FOREIGN KEY → users.id): User affected by action (if applicable)
  - `details` (jsonb): Additional action details
  - `created_at` (timestamptz, DEFAULT now()): Action timestamp

## Custom Types

### `user_role`
```sql
CREATE TYPE user_role AS ENUM ('admin', 'vip', 'pay', 'free');
```

### `message_role`
```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant');
```

## SQL Definitions

### Database Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'vip', 'pay', 'free');
CREATE TYPE message_role AS ENUM ('user', 'assistant');
```

### Core Tables Creation

```sql
-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User sessions table
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User credits table
CREATE TABLE user_credits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  total_tokens integer DEFAULT 0,
  used_tokens integer DEFAULT 0,
  remaining_tokens integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents table (for vector search)
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  content text,
  metadata jsonb,
  embedding vector(3072)
);

-- Law documents table
CREATE TABLE law (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  law_number text,
  category text,
  effective_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### History Tables Creation

```sql
-- Search history table
CREATE TABLE search_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  results jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Q&A history table
CREATE TABLE qa_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  source_documents jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Consultant conversations table
CREATE TABLE consultant_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  model_used text DEFAULT 'gemini-2.5-flash-preview-05-20',
  total_tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Consultant messages table
CREATE TABLE consultant_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES consultant_conversations(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content text NOT NULL,
  source_documents jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Admin logs table
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Indexes for Performance

```sql
-- Vector search index
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- History indexes
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at);
CREATE INDEX idx_qa_history_user_id ON qa_history(user_id);
CREATE INDEX idx_qa_history_created_at ON qa_history(created_at);
CREATE INDEX idx_consultant_conversations_user_id ON consultant_conversations(user_id);
CREATE INDEX idx_consultant_messages_conversation_id ON consultant_messages(conversation_id);

-- Law document indexes
CREATE INDEX idx_law_title ON law(title);
CREATE INDEX idx_law_category ON law(category);
CREATE INDEX idx_law_status ON law(status);

-- Admin logs index
CREATE INDEX idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- User credits policies
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Search history policies
CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Q&A history policies
CREATE POLICY "Users can view own qa history" ON qa_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qa history" ON qa_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Consultant conversation policies
CREATE POLICY "Users can view own conversations" ON consultant_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON consultant_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON consultant_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Consultant message policies
CREATE POLICY "Users can view messages in own conversations" ON consultant_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM consultant_conversations 
      WHERE id = consultant_messages.conversation_id
    )
  );

CREATE POLICY "Users can insert messages in own conversations" ON consultant_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM consultant_conversations 
      WHERE id = consultant_messages.conversation_id
    )
  );

-- Admin policies (admins can see everything)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Utility Functions

```sql
-- Function to match documents (vector search)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(3072),
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to deduct user tokens
CREATE OR REPLACE FUNCTION deduct_user_tokens(
  user_id uuid,
  tokens_to_deduct integer
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_credits 
  SET 
    used_tokens = used_tokens + tokens_to_deduct,
    remaining_tokens = remaining_tokens - tokens_to_deduct,
    updated_at = now()
  WHERE user_credits.user_id = deduct_user_tokens.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credits not found for user_id: %', user_id;
  END IF;
END;
$$;

-- Function to reset monthly tokens
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_credits 
  SET 
    used_tokens = 0,
    remaining_tokens = total_tokens,
    last_reset = now(),
    updated_at = now()
  WHERE last_reset < date_trunc('month', now());
END;
$$;
```

### Initial Data Setup

```sql
-- Insert sample admin user (replace with actual admin email)
INSERT INTO users (id, email, name, role) 
VALUES (
  uuid_generate_v4(),
  'admin@example.com',
  'System Administrator',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Initialize credits for existing users
INSERT INTO user_credits (user_id, total_tokens, remaining_tokens)
SELECT id, 1000, 1000 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_credits);
```

## Maintenance and Monitoring

### Regular Maintenance Tasks

1. **Token Reset**: Run monthly token reset for all users
2. **Session Cleanup**: Remove expired sessions
3. **Log Rotation**: Archive old admin logs
4. **Vector Index Maintenance**: Rebuild vector indexes periodically

### Monitoring Queries

```sql
-- Check user token usage
SELECT 
  u.email,
  u.role,
  uc.total_tokens,
  uc.used_tokens,
  uc.remaining_tokens
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
ORDER BY uc.used_tokens DESC;

-- Check system usage statistics
SELECT 
  COUNT(*) as total_searches,
  SUM(tokens_used) as total_tokens_used,
  AVG(tokens_used) as avg_tokens_per_search
FROM search_history
WHERE created_at >= date_trunc('month', now());

-- Check active conversations
SELECT 
  COUNT(*) as active_conversations,
  AVG(total_tokens_used) as avg_tokens_per_conversation
FROM consultant_conversations
WHERE updated_at >= now() - interval '7 days';
```

This database schema provides a robust foundation for the Macau Law Knowledge Base application with proper security, performance optimization, and comprehensive audit trails.
