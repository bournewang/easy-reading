import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import type { NewsListResponse } from '@/types/news';

interface UseArticlesOptions {
  category?: string;
  source?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const EMPTY_RESPONSE: NewsListResponse = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  categories: [],
  sources: [],
  lastSyncedAt: null,
};

export function useArticles(options: UseArticlesOptions = {}) {
  const [data, setData] = useState<NewsListResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchArticles = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<NewsListResponse>('/news', {
          params: {
            category: options.category && options.category !== 'all' ? options.category : undefined,
            source: options.source || undefined,
            search: options.search || undefined,
            page: options.page || 1,
            pageSize: options.pageSize || 20,
          },
        });

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch articles');
          setData(EMPTY_RESPONSE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchArticles();

    return () => {
      cancelled = true;
    };
  }, [options.category, options.page, options.pageSize, options.search, options.source]);

  return {
    articles: data.items,
    metadata: data,
    loading,
    error,
  };
}
