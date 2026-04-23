'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BackIcon, CheckIcon } from '@easy-reading/shared';
import type { Article, Paragraph } from '@easy-reading/shared';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import { useRouter, useParams } from 'next/navigation';
import ReaderShell from '@/components/ReaderShell';
import NewsReader from '@/components/reader/NewsReader';
import { api } from '@/utils/api';
import {
  createIELTSHistoryItem,
  createNewsHistoryItem,
  isRouteRead,
  saveReadingHistoryItemAsync,
} from '@/utils/reading-history';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';
import { useArticles } from '@/hooks/useArticles';
import { useNewsCategories } from '@/hooks/useNewsCategories';

type ReaderPageClientProps = {
  initialArticle?: Article | null;
  initialBackPath?: string;
  localArticleMode?: boolean;
  initialNewsSlug?: string | null;
  initialCategory?: string | null;
};

type IELTSArticleResource = {
  title: string;
  content: string;
  source?: string;
  wordCount?: number;
  readingTime?: number;
};

type NewsArticleResource = {
  id: string;
  article: Article;
  syncedAt?: string | null;
};

const newsArticleCache = new Map<string, Article | null>();
const newsArticleInFlightRequests = new Map<string, Promise<Article | null>>();

const DEFAULT_IELTS_ARTICLE_BASE_URL = '/ielts-articles';

function getIELTSArticleBaseUrl() {
  return process.env.NEXT_PUBLIC_IELTS_ARTICLE_BASE_URL || DEFAULT_IELTS_ARTICLE_BASE_URL;
}

function buildParagraphsFromContent(content: string): Record<number, Paragraph> {
  const paragraphs: Record<number, Paragraph> = {};

  content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph, index) => {
      paragraphs[index] = {
        type: 'text',
        content: paragraph,
      };
    });

  if (Object.keys(paragraphs).length === 0) {
    paragraphs[0] = {
      type: 'text',
      content: '',
    };
  }

  return paragraphs;
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function fetchIELTSArticle(articleId: string): Promise<Article | null> {
  const baseUrl = getIELTSArticleBaseUrl().replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/articles/${encodeURIComponent(articleId)}.json`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const rawArticle = (await response.json()) as IELTSArticleResource;
  const paragraphs = buildParagraphsFromContent(rawArticle.content || '');
  const textContent = Object.values(paragraphs)
    .filter((paragraph) => paragraph.type === 'text')
    .map((paragraph) => paragraph.content)
    .join(' ');
  const wordCount = rawArticle.wordCount || countWords(textContent);

  return {
    title: rawArticle.title,
    site_name: rawArticle.source || 'IELTS Reading',
    url: `ielts://${articleId}`,
    word_count: wordCount,
    paragraphs,
    unfamiliar_words: [],
    reading_time: rawArticle.readingTime || Math.max(1, Math.ceil(wordCount / 150)),
    created_at: new Date().toISOString(),
  };
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

function ReaderContent({
  initialArticle = null,
  initialBackPath = '/news',
  localArticleMode = false,
  initialNewsSlug = null,
  initialCategory = null,
}: ReaderPageClientProps) {
  const baseButtonClass =
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium tracking-[-0.22px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2';
  const primaryButtonClass = `${baseButtonClass} bg-[#0071e3] text-white hover:bg-[#0077ed]`;
  const darkButtonClass = `${baseButtonClass} bg-[#1d1d1f] text-white hover:bg-black`;
  const outlineButtonClass = `${baseButtonClass} border border-[#0066cc] bg-white/90 text-[#0066cc] hover:bg-[#0071e3]/[0.06]`;
  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const articleScrollRef = useRef<HTMLDivElement>(null);
  const { readerVocabularyData } = useVocabularyBooks({ loadWordDetails: true });
  const { extractArticle, loading, error } = useArticleExtractor();
  const params = useParams();
  const router = useRouter();
  const articleId = null; // Only for IELTS, not used here
  const newsSlug = params?.slug ? String(params.slug) : (initialNewsSlug || null);
  const urlParam = null; // Not used in new route
  const backPath = initialBackPath;
  const isNewsReader = !!newsSlug;
  const categoryParam = params?.category ? String(params.category) : (initialCategory || null);

  // Use cached categories
  const { categories: cachedCategories, firstArticleByCategory } = useNewsCategories();
  const newsCategories = cachedCategories;
  const activeCategory = categoryParam;
  const currentNewsRoute = newsSlug && activeCategory
    ? `/news-reader/${encodeURIComponent(activeCategory)}/${encodeURIComponent(newsSlug)}`
    : (newsSlug ? `/news-reader/${encodeURIComponent(newsSlug)}` : null);

  useEffect(() => {
    if (initialArticle) {
      return;
    }

    if (newsSlug) {
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
      return;
    }
  }, [extractArticle, initialArticle, localArticleMode, newsSlug]);

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
    if (!article) {
      return;
    }

    let cancelled = false;

    const loadReadState = async () => {
      if (articleId) {
        const nextIsRead = await isRouteRead(`/reader?articleId=${encodeURIComponent(articleId)}`);
        if (!cancelled) {
          setIsRead(nextIsRead);
        }
        return;
      }

      if (currentNewsRoute) {
        const nextIsRead = await isRouteRead(currentNewsRoute);
        if (!cancelled) {
          setIsRead(nextIsRead);
        }
      }
    };

    void loadReadState();

    return () => {
      cancelled = true;
    };
  }, [article, articleId, currentNewsRoute]);

  const handleMarkAsRead = async () => {
    if (!article) {
      return;
    }

    if (articleId) {
      await saveReadingHistoryItemAsync(
        createIELTSHistoryItem({
          routeUrl: `/reader?articleId=${encodeURIComponent(articleId)}`,
          title: article.title,
          subtitle: article.site_name,
          wordCount: article.word_count,
          readingTime: article.reading_time,
        }),
      );
      setIsRead(true);
      return;
    }

    if (!newsSlug) {
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

  if ((loading || queryLoading) && !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="rounded-[28px] bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Loading</div>
          <div className="mt-3 text-2xl text-[#1d1d1f] animate-spin">⏳</div>
        </div>
      </div>
    );
  }

  if ((error || queryError) && !article) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Reader</p>
          <h1 className="mb-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">Unable to load article</h1>
          <p className="mb-5 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">{queryError || error}</p>
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
    const emptyStateText = articleId || localArticleMode
      ? 'Open an IELTS reading article to start reading.'
      : 'Open an article from the news list to start reading.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Reader</p>
          <h1 className="mb-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">No article selected</h1>
          <p className="mb-5 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">{emptyStateText}</p>
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
        {isNewsReader ? (
          <div className="mb-3 shrink-0 rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-sm sm:p-5">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
              <Link href={backPath} className="hover:text-sky-700">
                News
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
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
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

            {/* <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 font-medium text-sky-700">
                {article.site_name || 'News'}
              </span>
              {article.reading_time ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {article.reading_time} min read
                </span>
              ) : null}
            </div> */}
          </div>
        ) : null}

        {/* <div className="flex items-center justify-between gap-3 pb-2 pt-5 md:pt-6">
          <button onClick={() => router.push(backPath)} className={outlineButtonClass}>
            <BackIcon className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-black/56">
              {article.site_name || (newsSlug ? 'News' : 'Reader')}
            </span>
            {article.reading_time ? (
              <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[12px] tracking-[-0.12px] text-black/56">
                {article.reading_time} min read
              </span>
            ) : null}
          </div>
        </div> */}

        <div className="min-h-0 flex-1 overflow-hidden pt-3 md:pt-4">
          <NewsReader
            article={article}
            activeNewsId={newsSlug}
            activeArticleUrl={article.url || urlParam}
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
                    Article Read
                  </>
                ) : (
                  'Mark as Read'
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

export default function ReaderPageClient(props: ReaderPageClientProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReaderContent {...props} />
    </Suspense>
  );
}
