'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReaderShell from '@/components/ReaderShell';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import ReaderWorkspace from '@/components/reader/ReaderWorkspace';
import { BOOK_LEVELS } from '@/lib/book-levels';
import type { BookChapterManifestItem, BookRecord } from '@/lib/books';
import { getBookChapterReaderUrl } from '@/lib/reading-routes';
import { type Article } from '@easy-reading/shared';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import {
  createBookHistoryItem,
  isRouteRead,
  saveReadingHistoryItemAsync,
} from '@/utils/reading-history';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';

type BookReaderClientProps = {
  book: BookRecord;
  chapters: BookChapterManifestItem[];
  levelLabel: string;
  initialArticle: Article;
  initialChapterNumber: number;
};

type BookChapterResource = BookChapterManifestItem & {
  content: string;
};

export default function BookReaderClient({
  book,
  chapters,
  levelLabel,
  initialArticle,
  initialChapterNumber,
}: BookReaderClientProps) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const booksNavigationLabel = t('website.navigation.books');
  const readerIndexText = (key: string) => t(`website.readerIndex.${key}`);
  const articleScrollRef = useRef<HTMLDivElement>(null);
  const initialChapterIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.chapterNumber === initialChapterNumber),
  );
  const [currentChapter, setCurrentChapter] = useState(initialChapterIndex);
  const [article, setArticle] = useState<Article>(initialArticle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const { readerVocabularyData } = useVocabularyBooks({ loadWordDetails: true });
  const currentChapterMeta = chapters[currentChapter] || null;
  const previousChapterIndex = currentChapter > 0 ? currentChapter - 1 : null;
  const nextChapterIndex = currentChapter < chapters.length - 1 ? currentChapter + 1 : null;
  const currentRouteUrl = currentChapterMeta
    ? getBookChapterReaderUrl(book.level, book.slug, currentChapterMeta.chapterNumber)
    : getBookChapterReaderUrl(book.level, book.slug, initialChapterNumber);

  const changeChapter = async (index: number) => {
    if (index === currentChapter || index < 0 || index >= chapters.length) {
      return;
    }

    setError(null);
    setLoading(true);
    const chapterMeta = chapters[index];
    router.replace(getBookChapterReaderUrl(book.level, book.slug, chapterMeta.chapterNumber));
  };

  useEffect(() => {
    setCurrentChapter(initialChapterIndex);
    setArticle(initialArticle);
    setLoading(false);
    setError(null);
    articleScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [initialArticle, initialChapterIndex]);

  useEffect(() => {
    const handleScroll = () => {
      const container = articleScrollRef.current;
      if (!container) {
        return;
      }

      const scrollPosition = container.scrollTop + container.clientHeight;
      const documentHeight = container.scrollHeight;
      setShowMarkAsRead(scrollPosition >= documentHeight - 100);
    };

    const container = articleScrollRef.current;
    container?.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container?.removeEventListener('scroll', handleScroll);
  }, [article]);

  useEffect(() => {
    let cancelled = false;

    const loadReadState = async () => {
      const nextIsRead = await isRouteRead(currentRouteUrl);
      if (!cancelled) {
        setIsRead(nextIsRead);
      }
    };

    void loadReadState();

    return () => {
      cancelled = true;
    };
  }, [currentRouteUrl]);

  const handleMarkAsRead = async () => {
    if (!currentChapterMeta) {
      return;
    }

    await saveReadingHistoryItemAsync(
      createBookHistoryItem({
        routeUrl: currentRouteUrl,
        title: article.title,
        subtitle: `${book.title} · Chapter ${currentChapterMeta.chapterNumber}`,
        wordCount: article.word_count,
        readingTime: article.reading_time,
      }),
    );
    setIsRead(true);
  };

  return (
    <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden bg-gray-50">
      <ReaderShell className="flex h-full min-h-0 flex-col py-3 pb-[calc(88px+0.5rem)] sm:py-4 sm:pb-[calc(88px+0.5rem)] xl:pb-4">
        <nav className="mb-3 shrink-0 text-sm text-gray-500">
          <Link href="/books" className="hover:text-blue-600">
            {booksNavigationLabel}
          </Link>
          <span className="mx-2">/</span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {BOOK_LEVELS.map((level, index) => {
              const isCurrentLevel = level.id === book.level;

              return (
                <span key={level.id} className="inline-flex items-center gap-1.5">
                  {index > 0 ? <span className="text-gray-300">/</span> : null}
                  <Link
                    href={`/books/${level.id}`}
                    aria-current={isCurrentLevel ? 'page' : undefined}
                    className={isCurrentLevel ? 'rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700' : 'hover:text-blue-600'}
                  >
                    {level.shortLabel}
                  </Link>
                </span>
              );
            })}
          </span>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{book.title}</span>
        </nav>

        <ReaderWorkspace
          article={article}
          containedScroll
          contentScrollRef={articleScrollRef}
          outerClassName="min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start xl:gap-3"
          navigation={{
            title: readerIndexText('catalogTitle'),
            description: readerIndexText('catalogDescription'),
            items: chapters.map((chapter, index) => ({
              id: chapter.id,
              overline: `${readerIndexText('chapter')} ${chapter.chapterNumber}`,
              title: chapter.chapterTitle || `${readerIndexText('chapter')} ${chapter.chapterNumber}`,
              meta: `${chapter.readingTime} ${readerIndexText('minute')}`,
              active: index === currentChapter,
              onSelect: () => void changeChapter(index),
            })),
            previous: {
              label: 'Prev',
              onSelect: () => previousChapterIndex !== null && void changeChapter(previousChapterIndex),
              disabled: loading || previousChapterIndex === null,
            },
            next: {
              label: 'Next',
              onSelect: () => nextChapterIndex !== null && void changeChapter(nextChapterIndex),
              disabled: loading || nextChapterIndex === null,
            },
            currentLabel: `${readerIndexText('chapter')} ${currentChapter + 1} / ${chapters.length}`,
            desktopClassName: 'hidden h-full min-h-0 xl:block',
            mobileClassName: 'fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur xl:hidden',
          }}
          warning={(
            <>
              {loading && (
                <div className="mb-3 shrink-0 text-right text-sm text-blue-600">Loading chapter...</div>
              )}
              {error && (
                <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <AnonymousReaderWarning />
            </>
          )}
          floatingAction={showMarkAsRead ? (
            <button
              type="button"
              onClick={handleMarkAsRead}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all ${
                isRead ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {isRead ? 'Read' : 'Mark as read'}
            </button>
          ) : null}
          panelClassName="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm"
          readerContainerClassName="min-h-0 flex-1 overflow-hidden"
          vocabularyHighlightColorByWord={readerVocabularyData.vocabularyHighlightColorByWord}
          vocabularyBookIdsByWord={readerVocabularyData.vocabularyBookIdsByWord}
          vocabularyWordDetailsByWord={readerVocabularyData.vocabularyWordDetailsByWord}
        />
      </ReaderShell>
    </div>
  );
}
