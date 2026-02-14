import { useState, useCallback } from 'react';
// import { api } from "../utils/api";
import axios from 'axios';
import type { Article } from '@easy-reading/shared';

export const useArticleExtractor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractArticle = useCallback(async (url: string): Promise<Article | null> => {
    setLoading(true);
    setError(null);

    try {
      const EXTRACT_URL = process.env.NEXT_PUBLIC_ARTICLE_EXTRACTOR_URL;
      const response = await axios.get(`${EXTRACT_URL}?url=${encodeURIComponent(url)}`);
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