'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { BackIcon, CheckIcon, Reader } from '@easy-reading/shared';
import type { Article, Paragraph } from '@easy-reading/shared';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import { useRouter, useSearchParams } from 'next/navigation';
import { getArticleStorageKey } from '@/utils/storage';

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

function ReaderContent({
  initialArticle = null,
  initialBackPath = '/news',
  localArticleMode = false,
}: ReaderPageClientProps) {
  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const { extractArticle, loading, error } = useArticleExtractor();
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('articleId');
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
  }, [articleId, extractArticle, initialArticle, localArticleMode, urlParam]);

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
    if (!article?.url) {
      return;
    }

    const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setIsRead(readArticles.includes(article.url));
  }, [article?.url]);

  const handleMarkAsRead = () => {
    if (!article?.url) {
      return;
    }

    const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    if (!readArticles.includes(article.url)) {
      readArticles.push(article.url);
      localStorage.setItem('readArticles', JSON.stringify(readArticles));
      localStorage.setItem(
        getArticleStorageKey(article.url),
        JSON.stringify({
          title: article.title,
          site_name: article.site_name,
          url: article.url,
          reading_time: article.reading_time,
          word_count: article.word_count,
          timestamp: Date.now(),
        }),
      );
      setIsRead(true);
    }
  };

  if ((loading || queryLoading) && !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="animate-spin text-2xl">⏳</div>
        </div>
      </div>
    );
  }

  if ((error || queryError) && !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-xl font-semibold mb-2">Unable to load article</h1>
          <p className="text-gray-600 mb-4">{queryError || error}</p>
          <button
            onClick={() => router.push(backPath)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-xl font-semibold mb-2">No article selected</h1>
          <p className="text-gray-600 mb-4">{emptyStateText}</p>
          <button
            onClick={() => router.push(backPath)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          >
            <BackIcon className="w-4 h-4 stroke-white" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto pb-24">
        <Reader article={article} />
        <button
          onClick={() => router.push(backPath)}
          className="fixed bottom-6 left-6 flex items-center gap-2 py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-600 text-white hover:bg-gray-700 z-50"
        >
          <BackIcon className="w-4 h-4 stroke-white" />
          <span className="text-sm">Back</span>
        </button>
        {showMarkAsRead && (
          <button
            onClick={handleMarkAsRead}
            className={`fixed bottom-6 left-1/2 flex items-center gap-2 transform -translate-x-1/2 py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 ${
              isRead ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="animate-spin text-2xl">⏳</div>
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
