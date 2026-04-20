'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReaderShell from '@/components/ReaderShell';
import BookChaptersSidebar from '@/components/books/BookChaptersSidebar';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import type { BookChapterManifestItem, BookRecord } from '@/lib/books';
import { getBookChapterReaderUrl } from '@/lib/reading-routes';
import { Reader, type Article } from '@easy-reading/shared';
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
            Books
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/books/${book.level}`} className="hover:text-blue-600">
            {levelLabel}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{book.title}</span>
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start xl:gap-3">
          <BookChaptersSidebar
            bookTitle={book.title}
            levelLabel={levelLabel}
            currentChapter={currentChapter}
            totalChapters={chapters.length}
            onChapterChange={changeChapter}
            loading={loading}
          />

          <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
            {loading && (
              <div className="mb-3 shrink-0 text-right text-sm text-blue-600">Loading chapter...</div>
            )}
            {error && (
              <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="shrink-0">
              <AnonymousReaderWarning />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <Reader
                article={article}
                containedScroll
                contentScrollRef={articleScrollRef}
                vocabularyHighlightColorByWord={readerVocabularyData.vocabularyHighlightColorByWord}
                vocabularyBookIdsByWord={readerVocabularyData.vocabularyBookIdsByWord}
                vocabularyWordDetailsByWord={readerVocabularyData.vocabularyWordDetailsByWord}
              />
            </div>
          </div>
        </div>
      </ReaderShell>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={() => previousChapterIndex !== null && changeChapter(previousChapterIndex)}
            disabled={loading || previousChapterIndex === null}
            className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <div className="min-w-0 text-center text-sm text-slate-600">
            <span className="font-medium text-slate-900">Chapter {currentChapter + 1}</span>
            <span className="mx-1 text-slate-300">/</span>
            <span>{chapters.length}</span>
          </div>
          <button
            type="button"
            onClick={() => nextChapterIndex !== null && changeChapter(nextChapterIndex)}
            disabled={loading || nextChapterIndex === null}
            className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showMarkAsRead && (
        <button
          type="button"
          onClick={handleMarkAsRead}
          className={`fixed right-6 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all xl:bottom-6 ${
            isRead ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
          } bottom-[5.5rem]`}
        >
          {isRead ? 'Read' : 'Mark as read'}
        </button>
      )}
    </div>
  );
}
