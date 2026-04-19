'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { BackIcon, CheckIcon, Reader } from '@easy-reading/shared';
import type { Article, Paragraph } from '@easy-reading/shared';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import { useRouter, useSearchParams } from 'next/navigation';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import { api } from '@/utils/api';
import {
  createIELTSHistoryItem,
  createNewsHistoryItem,
  isRouteRead,
  saveReadingHistoryItemAsync,
} from '@/utils/reading-history';

type ReaderPageClientProps = {
  initialArticle?: Article | null;
  initialBackPath?: string;
  localArticleMode?: boolean;
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
  try {
    const response = await api.get<NewsArticleResource>(`/news/${encodeURIComponent(newsId)}`);
    const article = response.data?.article;
    if (!article) {
      return null;
    }
    if (!article.reading_time) {
      article.reading_time = Math.max(1, Math.ceil((article.word_count || 0) / 150));
    }
    return article;
  } catch {
    return null;
  }
}

function ReaderContent({
  initialArticle = null,
  initialBackPath = '/news',
  localArticleMode = false,
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
  const { extractArticle, loading, error } = useArticleExtractor();
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('articleId');
  const newsId = searchParams.get('newsId');
  const urlParam = searchParams.get('url');
  const backPath = articleId || localArticleMode ? '/ielts' : initialBackPath;

  useEffect(() => {
    if (initialArticle) {
      return;
    }

    if (articleId) {
      setQueryLoading(true);
      setQueryError(null);

      fetchIELTSArticle(articleId)
        .then((data) => {
          if (!data) {
            setQueryError('This IELTS article could not be found.');
            return;
          }

          setArticle(data);
        })
        .catch(() => {
          setQueryError('Unable to load IELTS article.');
        })
        .finally(() => {
          setQueryLoading(false);
        });
      return;
    }

    if (newsId) {
      setQueryLoading(true);
      setQueryError(null);

      fetchNewsArticle(newsId)
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

    if (!urlParam || localArticleMode) {
      return;
    }

    extractArticle(urlParam).then((data) => {
      if (!data) {
        return;
      }

      if (!data.reading_time) {
        data.reading_time = Math.ceil(data.word_count / 150);
      }

      setArticle(data);
    });
  }, [articleId, extractArticle, initialArticle, localArticleMode, newsId, urlParam]);

  useEffect(() => {
    if (!article) {
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      setShowMarkAsRead(scrollPosition >= documentHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

      if (urlParam) {
        const nextIsRead = await isRouteRead(`/reader?url=${encodeURIComponent(urlParam)}`);
        if (!cancelled) {
          setIsRead(nextIsRead);
        }
        return;
      }

      if (newsId) {
        const nextIsRead = await isRouteRead(`/reader?newsId=${encodeURIComponent(newsId)}`);
        if (!cancelled) {
          setIsRead(nextIsRead);
        }
      }
    };

    void loadReadState();

    return () => {
      cancelled = true;
    };
  }, [article, articleId, newsId, urlParam]);

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

    if (!urlParam) {
      if (!newsId) {
        return;
      }
    }

    await saveReadingHistoryItemAsync(
      createNewsHistoryItem({
        article,
        routeUrl: newsId ? `/reader?newsId=${encodeURIComponent(newsId)}` : undefined,
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
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 pb-2 pt-5 md:px-6 md:pt-6">
        <button onClick={() => router.push(backPath)} className={outlineButtonClass}>
          <BackIcon className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-black/56">
            {article.site_name || (newsId ? 'News' : 'Reader')}
          </span>
          {article.reading_time ? (
            <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[12px] tracking-[-0.12px] text-black/56">
              {article.reading_time} min read
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-3 md:px-6 md:pb-32 md:pt-4">
        <AnonymousReaderWarning />
        <Reader article={article} />
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 px-4">
        {showMarkAsRead && (
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
        )}
      </div>
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
