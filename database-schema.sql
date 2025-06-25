-- Database Schema for Macau Law Knowledge Base Web Application
-- Execute this SQL in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (role IN ('admin', 'free', 'pay', 'vip')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User credits for token management
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_tokens INTEGER NOT NULL DEFAULT 1000,
    used_tokens INTEGER NOT NULL DEFAULT 0,
    remaining_tokens INTEGER NOT NULL DEFAULT 1000,
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token usage tracking
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('legal_search', 'legal_qa', 'legal_consultant')),
    tokens_used INTEGER NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal search history
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    document_ids INTEGER[] NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal Q&A history
CREATE TABLE IF NOT EXISTS qa_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    document_ids INTEGER[] NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal consultant conversations
CREATE TABLE IF NOT EXISTS consultant_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    model_used VARCHAR(100) NOT NULL DEFAULT 'gemini-2.5-flash-preview-05-20',
    total_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal consultant messages
CREATE TABLE IF NOT EXISTS consultant_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES consultant_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    document_ids INTEGER[],
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_history_user_id ON qa_history(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_history_created_at ON qa_history(created_at);
CREATE INDEX IF NOT EXISTS idx_consultant_conversations_user_id ON consultant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultant_messages_conversation_id ON consultant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_consultant_messages_created_at ON consultant_messages(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for user_credits table
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all credits" ON user_credits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for search_history table
CREATE POLICY "Users can view own search history" ON search_history
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all search history" ON search_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for qa_history table
CREATE POLICY "Users can view own QA history" ON qa_history
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all QA history" ON qa_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for consultant_conversations table
CREATE POLICY "Users can manage own conversations" ON consultant_conversations
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all conversations" ON consultant_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for consultant_messages table
CREATE POLICY "Users can manage own messages" ON consultant_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM consultant_conversations 
            WHERE id = conversation_id AND user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Admins can view all messages" ON consultant_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
