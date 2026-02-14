import { useState, useCallback } from 'react';
import type { Article } from '../types/article';
import { api } from '../utils/api';

export const useArticleExtractor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractArticle = useCallback(async (url: string): Promise<Article | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/extract?url=${encodeURIComponent(url)}`);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract article';
      setError(message);
      console.error(message)
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    extractArticle,
    loading,
    error
  };
};