// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'free' | 'pay' | 'vip';

export interface UserSession {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

// Token and Credit Management
export interface UserCredit {
  id: string;
  user_id: string;
  total_tokens: number;
  used_tokens: number;
  remaining_tokens: number;
  last_reset: string;
  created_at: string;
  updated_at: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  feature_type: FeatureType;
  tokens_used: number;
  model_used: string;
  cost_usd: number;
  created_at: string;
}

export type FeatureType = 'legal_search' | 'legal_qa' | 'legal_consultant';

// Legal Search Types
export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  document_ids: number[];
  tokens_used: number;
  created_at: string;
}

export interface SearchResult {
  id: number;
  content: string;
  metadata: DocumentMetadata;
  similarity: number;
}

// Legal Q&A Types
export interface QAHistory {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  document_ids: number[];
  tokens_used: number;
  created_at: string;
}

// Legal Consultant Types
export interface ConsultantConversation {
  id: string;
  user_id: string;
  title: string;
  model_used: string;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultantMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  document_ids?: number[];
  tokens_used: number;
  created_at: string;
}

// Document and Law Types
export interface DocumentMetadata {
  db_id: number;
  law_id: string;
  title: string;
  link: string;
  bo: {
    group: string;
    bo_id: string;
    public_date: string;
    page: number;
  };
  relate: {
    altered?: string[];
    abolished?: string[];
    partially_abolished?: string[];
    abolishing?: string[];
  };
}

export interface LawDocument {
  id: number;
  link: string;
  law_id: string;
  title: string;
  bo: any;
  relate: any;
  content: string;
  status: number;
  update_on: string;
}

// System Settings Types
export interface SystemSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_by: string;
  updated_at: string;
}

// Admin Types
export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  details: any;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StreamResponse {
  type: 'progress' | 'chunk' | 'complete' | 'error';
  content?: string;
  progress?: string;
  error?: string;
}

// Form Types
export interface SearchForm {
  query: string;
}

export interface ConsultantForm {
  message: string;
}

// Gemini AI Types
export interface GeminiConfig {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens_used: number;
}

export interface ChatResponse {
  content: string;
  tokens_used: number;
  model_used: string;
}
