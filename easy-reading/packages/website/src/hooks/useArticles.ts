import { useState, useEffect } from 'react';
import type { FeaturedArticle } from '@/data/articles';

export function useArticles() {
  const [articles, setArticles] = useState<FeaturedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_FETCH_ARTICLES_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        const data = await response.json();
        setArticles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch articles');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  return { articles, loading, error };
} 