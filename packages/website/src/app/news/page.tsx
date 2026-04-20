'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { useArticles } from '@/hooks/useArticles';
import type { NewsArticle } from '@/types/news';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { isSourceRead } from '@/utils/reading-history';

const backgroundColors = {
  general: '#3B82F6',
  culture: '#8B5CF6',
  travel: '#10B981',
  arts: '#F59E0B',
  business: '#F59E0B',
  earth: '#F59E0B'
}

function ArticleCard({
  article,
  onClick,
  categoryLabel,
  isRead,
}: {
  article: NewsArticle;
  onClick: () => void;
  categoryLabel: string;
  isRead: boolean;
}) {
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer p-4 relative"
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
            <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full text-white"
                style={{ backgroundColor: backgroundColors[article.category] }}>
            {categoryLabel}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-2">{article.title}</h3>
        <p className="text-gray-600 flex-grow">{article.description}</p>
        {isRead && (
          <div className="absolute bottom-4 right-4 bg-green-500 text-white rounded-full p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCardWithImage({
  article,
  onClick,
  categoryLabel,
  isRead,
}: {
  article: NewsArticle;
  onClick: () => void;
  categoryLabel: string;
  isRead: boolean;
}) {
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <img 
        src={`${process.env.NEXT_PUBLIC_IMAGE_LOADER_URL}?url=${article.imageUrl}`} 
        alt={article.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
            <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full text-white"
                style={{ backgroundColor: backgroundColors[article.category] }}>
            {categoryLabel}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-2">{article.title}</h3>
        <p className="text-gray-600">{article.description}</p>
        {isRead && (
          <div className="absolute bottom-4 right-4 bg-green-500 text-white rounded-full p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function UrlReaderContent() {
  const { t } = useLocaleContext();
  const searchParams = useSearchParams();
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const router = useRouter();
  const news = (key: string) => t(`website.newsPage.${key}`);
  const selectedCategory = searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const currentPage = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const {
    articles: featuredArticles,
    metadata,
    loading: articlesLoading,
    error: articlesError,
  } = useArticles({
    category: selectedCategory,
    search: searchQuery,
    page: currentPage,
    pageSize: 18,
  });

  const getCategoryLabel = (category: string) => {
    const normalized = category.charAt(0).toUpperCase() + category.slice(1);
    return news(`categories${normalized}`);
  };

  const categories = ['all', ...metadata.categories];

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
        return;
      }
      nextParams.set(key, value);
    });

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/news?${nextQuery}` : '/news');
  };

  const handleArticleClick = async (articleUrl: string) => {
    const selectedArticle = featuredArticles.find((article) => article.url === articleUrl);
    if (selectedArticle?.id) {
      router.push(`/reader?newsId=${encodeURIComponent(selectedArticle.id)}`);
      return;
    }
    router.push(`/reader?url=${encodeURIComponent(articleUrl)}`);
  };

  useEffect(() => {
    let cancelled = false;

    const loadReadArticles = async () => {
      const nextReadArticles = new Set<string>();

      await Promise.all(
        featuredArticles.map(async (article) => {
          if (await isSourceRead(article.url)) {
            nextReadArticles.add(article.url);
          }
        }),
      );

      if (!cancelled) {
        setReadArticles(nextReadArticles);
      }
    };

    void loadReadArticles();

    return () => {
      cancelled = true;
    };
  }, [featuredArticles]);

  const getFilteredAndSplitArticles = () => {
    const withImages = featuredArticles.filter((article) => article.imageUrl);
    const withoutImages = featuredArticles.filter((article) => !article.imageUrl);

    return { featuredWithImages: withImages, remainingArticles: withoutImages };
  };

  const { featuredWithImages, remainingArticles } = getFilteredAndSplitArticles();

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <PageShell className="pb-10 pt-4 md:pb-14 md:pt-6">
        <section className="mb-6 rounded-[36px] bg-[linear-gradient(135deg,#1e3a8a_0%,#0f4c81_52%,#0b7285_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:px-8 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-sky-100/90">News</p>
              <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[48px]">{news('title')}</h1>
              <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.24px] text-white/72 md:text-[16px]">
                Read current English articles in a cleaner flow, then open any story with built-in dictionary, translation, and word saving support.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-sky-100/15 p-3.5 ring-1 ring-sky-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Articles</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{metadata.total}</p>
              </div>
              <div className="rounded-[24px] bg-emerald-100/15 p-3.5 ring-1 ring-emerald-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Read</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{readArticles.size}</p>
              </div>
            </div>
          </div>
        </section>
        {articlesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : articlesError ? (
          <div className="text-center py-8 text-red-600">
            {articlesError}
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => updateSearchParams({ category: category === 'all' ? null : category, page: null })}
                    className={`rounded-full px-4 py-2 capitalize text-[14px] font-medium tracking-[-0.22px] ${
                      selectedCategory === category
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-[#f5f5f7] text-black/64 hover:bg-black/5'
                    }`}
                  >
                    {category === 'all' ? news('categoriesAll') : getCategoryLabel(category)}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <input
                  type="text"
                  placeholder={news('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    updateSearchParams({ search: e.target.value || null, page: null });
                  }}
                  className="w-full rounded-[18px] border border-black/10 bg-[#fafafc] px-4 py-3 text-[14px] tracking-[-0.22px] text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <svg
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[14px] tracking-[-0.22px] text-black/56">
              <span>
                {metadata.total} article{metadata.total === 1 ? '' : 's'}
              </span>
              {metadata.lastSyncedAt ? (
                <span>Updated {new Date(metadata.lastSyncedAt).toLocaleString()}</span>
              ) : null}
            </div>

            {featuredWithImages.length > 0 && (
              <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredWithImages.map(article => (
                  <ArticleCardWithImage
                    key={article.url}
                    article={article}
                    categoryLabel={getCategoryLabel(article.category)}
                    onClick={() => handleArticleClick(article.url)}
                    isRead={readArticles.has(article.url)}
                  />
                ))}
              </div>
            )}

            {remainingArticles.length > 0 && (
              <>
                <h2 className="mb-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">{news('moreArticles')}</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remainingArticles.map(article => (
                    <ArticleCard
                      key={article.url}
                      article={article}
                      categoryLabel={getCategoryLabel(article.category)}
                      onClick={() => handleArticleClick(article.url)}
                      isRead={readArticles.has(article.url)}
                    />
                  ))}
                </div>
              </>
            )}

            {metadata.totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSearchParams({ page: currentPage > 1 ? String(currentPage - 1) : null })}
                  disabled={currentPage <= 1}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {metadata.page} / {metadata.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateSearchParams({
                      page: currentPage < metadata.totalPages ? String(currentPage + 1) : String(metadata.totalPages),
                    })
                  }
                  disabled={currentPage >= metadata.totalPages}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </PageShell>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function NewsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UrlReaderContent />
    </Suspense>
  );
}
