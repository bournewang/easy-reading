export interface Paragraph {
  type: 'text' | 'image';
  content: string;
  alt?: string;
  description?: string;
}

export interface Article {
  id?: number;
  title: string;
  // content: string;
  site_name: string;
  url: string;
  word_count: number;
  paragraphs: Record<number, Paragraph>;
  unfamiliar_words: string[];
  reading_time: number;
  created_at: string;
}