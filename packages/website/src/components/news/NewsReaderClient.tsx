'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { BackIcon, CheckIcon } from '@easy-reading/shared';
import type { Article, ReaderProps } from '@easy-reading/shared';
import { useRouter, useParams } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import ReaderShell from '@/components/ReaderShell';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import ReaderWorkspace from '@/components/reader/ReaderWorkspace';
import { api } from '@/utils/api';
import {
  createNewsHistoryItem,
  isRouteRead,
  saveReadingHistoryItemAsync,
} from '@/utils/reading-history';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';
import { useArticles } from '@/hooks/useArticles';
import { useNewsCategories } from '@/hooks/useNewsCategories';

type NewsReaderClientProps = {
  initialArticle?: Article | null;
  initialBackPath?: string;
  initialNewsSlug?: string | null;
  initialCategory?: string | null;
};

type NewsArticleResource = {
  id: string;
  article: Article;
  syncedAt?: string | null;
};

type NewsReaderWorkspaceProps = {
  article: Article;
  activeNewsId?: string | null;
  activeArticleUrl?: string | null;
  activeCategory?: string | null;
  contentScrollRef?: RefObject<HTMLDivElement>;
  floatingAction?: ReactNode;
} & Pick<
  ReaderProps,
  'vocabularyHighlightColorByWord' | 'vocabularyBookIdsByWord' | 'vocabularyWordDetailsByWord'
>;

const newsArticleCache = new Map<string, Article | null>();
const newsArticleInFlightRequests = new Map<string, Promise<Article | null>>();

function NewsReaderWorkspace({
  article,
  activeNewsId,
  activeArticleUrl,
  activeCategory,
  contentScrollRef,
  floatingAction,
  vocabularyHighlightColorByWord,
  vocabularyBookIdsByWord,
  vocabularyWordDetailsByWord,
}: NewsReaderWorkspaceProps) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const readerIndexText = (key: string) => t(`website.readerIndex.${key}`);
  const { articles } = useArticles({ page: 1, pageSize: 18, category: activeCategory || undefined });
  const items = useMemo(
    () =>
      articles.map((item) => ({
        id: item.id,
        overline: item.source,
        title: item.title,
        meta: `${item.readingTime} ${readerIndexText('minute')}`,
        active:
          (activeNewsId && item.id === activeNewsId) ||
          (!activeNewsId && activeArticleUrl && item.url === activeArticleUrl),
        onSelect: () => {
          router.push(`/news-reader/${encodeURIComponent(activeCategory || item.category)}/${encodeURIComponent(item.id)}`);
        },
      })),
    [activeArticleUrl, activeCategory, activeNewsId, articles, router, readerIndexText],
  );

  return (
    <ReaderWorkspace
      article={article}
      containedScroll
      contentScrollRef={contentScrollRef}
      outerClassName="min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start xl:gap-5"
      navigation={
        activeNewsId || activeArticleUrl
          ? {
              title: readerIndexText('newsTitle'),
              description: readerIndexText('newsDescription'),
              persistScrollKey: `news:${activeCategory || 'all'}`,
              items,
              desktopClassName: 'hidden h-full min-h-0 xl:block',
              mobileClassName: 'fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur xl:hidden',
            }
          : undefined
      }
      warning={<AnonymousReaderWarning />}
      floatingAction={floatingAction}
      panelClassName="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      readerContainerClassName="min-h-0 flex-1 overflow-hidden"
      vocabularyHighlightColorByWord={vocabularyHighlightColorByWord}
      vocabularyBookIdsByWord={vocabularyBookIdsByWord}
      vocabularyWordDetailsByWord={vocabularyWordDetailsByWord}
    />
  );
}

async function fetchNewsArticle(newsId: string): Promise<Article | null> {
  const cachedArticle = newsArticleCache.get(newsId);
  if (cachedArticle !== undefined) {
    return cachedArticle;
  }

  const inflightRequest = newsArticleInFlightRequests.get(newsId);
  if (inflightRequest) {
    return inflightRequest;
  }

  const request = (async () => {
    try {
      const response = await api.get<NewsArticleResource>(`/news/${encodeURIComponent(newsId)}`);
      const article = response.data?.article;
      if (!article) {
        newsArticleCache.set(newsId, null);
        return null;
      }
      if (!article.reading_time) {
        article.reading_time = Math.max(1, Math.ceil((article.word_count || 0) / 150));
      }
      newsArticleCache.set(newsId, article);
      return article;
    } catch {
      newsArticleCache.set(newsId, null);
      return null;
    } finally {
      newsArticleInFlightRequests.delete(newsId);
    }
  })();

  newsArticleInFlightRequests.set(newsId, request);

  return request;
}

function NewsReaderContent({
  initialArticle = null,
  initialBackPath = '/news',
  initialNewsSlug = null,
  initialCategory = null,
}: NewsReaderClientProps) {
  const { t } = useLocaleContext();
  const baseButtonClass =
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium tracking-[-0.22px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2';
  const primaryButtonClass = `${baseButtonClass} bg-[#0071e3] text-white hover:bg-[#0077ed]`;
  const darkButtonClass = `${baseButtonClass} bg-[#1d1d1f] text-white hover:bg-black`;
  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const articleScrollRef = useRef<HTMLDivElement>(null);
  const { readerVocabularyData } = useVocabularyBooks({ loadWordDetails: true });
  const params = useParams();
  const router = useRouter();
  const newsSlug = params?.slug ? String(params.slug) : (initialNewsSlug || null);
  const backPath = initialBackPath;
  const categoryParam = params?.category ? String(params.category) : (initialCategory || null);

  const { categories: cachedCategories, firstArticleByCategory } = useNewsCategories();
  const newsCategories = cachedCategories;
  const activeCategory = categoryParam;
  const getCategoryLabel = (category: string) => {
    const normalized = category.charAt(0).toUpperCase() + category.slice(1);
    const key = `website.newsPage.categories${normalized}`;
    return t(key, normalized);
  };
  const currentNewsRoute = newsSlug && activeCategory
    ? `/news-reader/${encodeURIComponent(activeCategory)}/${encodeURIComponent(newsSlug)}`
    : (newsSlug ? `/news-reader/${encodeURIComponent(newsSlug)}` : null);

  useEffect(() => {
    if (initialArticle) {
      return;
    }

    if (!newsSlug) {
      return;
    }

    setQueryLoading(true);
    setQueryError(null);

    fetchNewsArticle(newsSlug)
      .then((data) => {
        if (!data) {
          setQueryError('This news article could not be found.');
          return;
        }
        setArticle(data);
      })
      .catch(() => {
        setQueryError('Unable to load news article.');
      })
      .finally(() => {
        setQueryLoading(false);
      });
  }, [initialArticle, newsSlug]);

  useEffect(() => {
    if (!article) {
      return;
    }

    const container = articleScrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + container.clientHeight;
      const documentHeight = container.scrollHeight;
      setShowMarkAsRead(scrollPosition >= documentHeight - 100);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [article]);

  useEffect(() => {
    articleScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setShowMarkAsRead(false);
  }, [article]);

  useEffect(() => {
    if (!article || !currentNewsRoute) {
      return;
    }

    let cancelled = false;

    const loadReadState = async () => {
      const nextIsRead = await isRouteRead(currentNewsRoute);
      if (!cancelled) {
        setIsRead(nextIsRead);
      }
    };

    void loadReadState();

    return () => {
      cancelled = true;
    };
  }, [article, currentNewsRoute]);

  const handleMarkAsRead = async () => {
    if (!article || !newsSlug) {
      return;
    }

    await saveReadingHistoryItemAsync(
      createNewsHistoryItem({
        article,
        routeUrl: currentNewsRoute || undefined,
      }),
    );
    setIsRead(true);
  };

  if (queryLoading && !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="rounded-[28px] bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Loading</div>
          <div className="mt-3 text-2xl text-[#1d1d1f] animate-spin">⏳</div>
        </div>
      </div>
    );
  }

  if (queryError && !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Reader</p>
          <h1 className="mb-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">Unable to load article</h1>
          <p className="mb-5 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">{queryError}</p>
          <button
            onClick={() => router.push(backPath)}
            className={darkButtonClass}
          >
            <BackIcon className="w-4 h-4 stroke-white" />
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Reader</p>
          <h1 className="mb-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">No article selected</h1>
          <p className="mb-5 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">Open an article from the news list to start reading.</p>
          <button
            onClick={() => router.push(backPath)}
            className={darkButtonClass}
          >
            <BackIcon className="w-4 h-4 stroke-white" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden bg-[#f5f5f7]">
      <ReaderShell className="flex h-full min-h-0 flex-col py-3 pb-6 sm:py-4 xl:pb-4">
        <div className="mb-3 shrink-0 rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-sm sm:p-5">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
            <Link href={backPath} className="hover:text-sky-700">
              {t('website.navigation.news')}
            </Link>
            {(newsCategories.length > 0 || activeCategory) ? (
              <>
                <span className="mx-1 text-slate-300">/</span>
                <div className="flex flex-wrap items-center gap-1">
                  {(newsCategories.length > 0 ? newsCategories : [activeCategory]).filter(Boolean).map((cat) => {
                    const isActive = cat === activeCategory;
                    const firstArticleId = cat ? firstArticleByCategory[cat] : '';
                    const catHref = cat && firstArticleId
                      ? `/news-reader/${encodeURIComponent(cat)}/${encodeURIComponent(firstArticleId)}`
                      : backPath;
                    return (
                      <Link
                        key={cat}
                        href={catHref}
                        aria-current={isActive ? 'page' : undefined}
                        className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-sky-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                        }`}
                      >
                        {getCategoryLabel(cat)}
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : null}
            {article.title ? (
              <>
                <span className="mx-1 text-slate-300">/</span>
                <span
                  aria-current="page"
                  className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                  title={article.title}
                >
                  {article.title}
                </span>
              </>
            ) : null}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pt-3 md:pt-4">
          <NewsReaderWorkspace
            article={article}
            activeNewsId={newsSlug}
            activeArticleUrl={article.url}
            activeCategory={activeCategory}
            contentScrollRef={articleScrollRef}
            vocabularyHighlightColorByWord={readerVocabularyData.vocabularyHighlightColorByWord}
            vocabularyBookIdsByWord={readerVocabularyData.vocabularyBookIdsByWord}
            vocabularyWordDetailsByWord={readerVocabularyData.vocabularyWordDetailsByWord}
            floatingAction={showMarkAsRead ? (
              <button
                onClick={handleMarkAsRead}
                className={isRead ? `${darkButtonClass} shadow-[0_10px_30px_rgba(0,0,0,0.18)]` : `${primaryButtonClass} shadow-[0_10px_30px_rgba(0,113,227,0.28)]`}
              >
                {isRead ? (
                  <>
                    <CheckIcon className="w-4 h-4 stroke-white" />
                    {t('website.common.completed')}
                  </>
                ) : (
                  t('website.common.markAsRead')
                )}
              </button>
            ) : null}
          />
        </div>
      </ReaderShell>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
      <div className="rounded-[28px] bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Loading</div>
        <div className="mt-3 text-2xl text-[#1d1d1f] animate-spin">⏳</div>
      </div>
    </div>
  );
}

export default function NewsReaderClient(props: NewsReaderClientProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewsReaderContent {...props} />
    </Suspense>
  );
}