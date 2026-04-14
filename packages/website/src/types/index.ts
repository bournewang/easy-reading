export interface Paragraph {
  type: 'text' | 'image';
  content: string;
  alt?: string;
  description?: string;
}

export interface Article {
  id?: string | number;
  title: string;
  content?: string;
  site_name?: string;
  source?: string;
  url?: string;
  word_count?: number;
  paragraphs?: Record<number, Paragraph>;
  unfamiliar_words?: string[];
  reading_time?: number;
  created_at?: string;
  level?: string;
  category?: string;
  publishedAt?: string;
}

export type KeywordLevel =
  | 'A1'
  | 'A2'
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C2'
  | 'IELTS'
  | 'TOEFL';

export type KeywordCategory = 'IELTS' | 'TOEFL' | 'CEFR';

export interface Keyword {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  examples: string[];
  level: KeywordLevel;
  category: KeywordCategory;
}
