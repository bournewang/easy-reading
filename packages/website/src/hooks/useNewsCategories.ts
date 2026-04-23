import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

const CATEGORIES_CACHE_KEY = 'news_categories_cache_v1';
const CATEGORIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

type NewsCategoriesResponse = {
  categories?: string[];
  firstArticleByCategory?: Record<string, string>;
  lastSyncedAt?: string | null;
};

export function useNewsCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [firstArticleByCategory, setFirstArticleByCategory] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const cached = window.localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached) as {
          data?: NewsCategoriesResponse;
          ts?: number;
        };
        if (Date.now() - ts < CATEGORIES_CACHE_TTL) {
          setCategories(data?.categories || []);
          setFirstArticleByCategory(data?.firstArticleByCategory || {});
          setLoading(false);
          return;
        }
      } catch {}
    }

    setLoading(true);
    setError(null);
    api.get<NewsCategoriesResponse>('/news-categories')
      .then((res) => {
        const nextData: NewsCategoriesResponse = {
          categories: res.data.categories || [],
          firstArticleByCategory: res.data.firstArticleByCategory || {},
          lastSyncedAt: res.data.lastSyncedAt || null,
        };
        setCategories(nextData.categories || []);
        setFirstArticleByCategory(nextData.firstArticleByCategory || {});
        window.localStorage.setItem(
          CATEGORIES_CACHE_KEY,
          JSON.stringify({ data: nextData, ts: Date.now() }),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      })
      .finally(() => setLoading(false));
  }, []);

  return { categories, firstArticleByCategory, loading, error };
}
