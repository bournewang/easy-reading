// Core API types
export interface ApiResponse<T = unknown> {
  data?: T;
  status: number;
  message?: string;
  errors?: Record<string, string[]>;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface RegisterRequest extends LoginRequest {
  name?: string;
}

export interface RegisterResponse extends LoginResponse {}

// Article types
export interface ArticleCreateRequest {
  url: string;
  title?: string;
  content?: string;
}

export interface ArticleUpdateRequest {
  title?: string;
  content?: string;
  unfamiliar_words?: string[];
}

// Word list types
export interface WordListCreateRequest {
  name: string;
  words?: string[];
}

export interface WordListUpdateRequest {
  name?: string;
  words?: string[];
}

// Translation types
export interface TranslationRequest {
  text: string;
  target_lang: string;
  source_lang?: string;
}

export interface TranslationResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
}

// Other types
export interface Expression {
  text: string;
  translation: string;
  frequency: number;
}

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}