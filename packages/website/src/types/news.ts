export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  imageUrl: string | null;
  source: string;
  readingTime: number;
}

export interface NewsListResponse {
  items: NewsArticle[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  categories: string[];
  sources: string[];
  lastSyncedAt: string | null;
}
