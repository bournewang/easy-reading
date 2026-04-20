'use client';

import { useMemo, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { type Article, type ReaderProps } from '@easy-reading/shared';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import ReaderWorkspace from '@/components/reader/ReaderWorkspace';
import { useArticles } from '@/hooks/useArticles';

type NewsReaderProps = {
  article: Article;
  activeNewsId?: string | null;
  activeArticleUrl?: string | null;
  contentScrollRef?: RefObject<HTMLDivElement>;
  floatingAction?: ReactNode;
} & Pick<
  ReaderProps,
  'vocabularyHighlightColorByWord' | 'vocabularyBookIdsByWord' | 'vocabularyWordDetailsByWord'
>;

export default function NewsReader({
  article,
  activeNewsId,
  activeArticleUrl,
  contentScrollRef,
  floatingAction,
  vocabularyHighlightColorByWord,
  vocabularyBookIdsByWord,
  vocabularyWordDetailsByWord,
}: NewsReaderProps) {
  const router = useRouter();
  const { articles, loading, error } = useArticles({ page: 1, pageSize: 18 });
  const items = useMemo(
    () =>
      articles.map((item) => ({
        id: item.id,
        overline: item.source,
        title: item.title,
        meta: `${item.readingTime} min`,
        active:
          (activeNewsId && item.id === activeNewsId) ||
          (!activeNewsId && activeArticleUrl && item.url === activeArticleUrl),
        onSelect: () => router.push(`/news-reader/${encodeURIComponent(item.id)}`),
      })),
    [activeArticleUrl, activeNewsId, articles, router],
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
              title: 'News',
              description: loading ? 'Loading articles...' : error ? 'Unable to load news list.' : 'Latest articles',
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