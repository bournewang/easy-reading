'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChapterSelector } from '@/components/ChapterSelector';
import BookChaptersSidebar from '@/components/books/BookChaptersSidebar';
import type { BookChapterManifestItem, BookRecord } from '@/lib/books';
import { getBookChapterReaderUrl } from '@/lib/reading-routes';
import { Reader, type Article } from '@easy-reading/shared';
import {
  createBookHistoryItem,
  isRouteRead,
  saveReadingHistoryItem,
} from '@/utils/reading-history';

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
  const currentChapterMeta = chapters[currentChapter] || null;
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
    setIsRead(isRouteRead(currentRouteUrl));
  }, [currentRouteUrl]);

  const handleMarkAsRead = () => {
    if (!currentChapterMeta) {
      return;
    }

    saveReadingHistoryItem(
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
      <div className="container mx-auto flex h-full min-h-0 flex-col px-3 py-3 pb-[calc(112px+0.5rem)] sm:px-4 sm:py-4 sm:pb-[calc(132px+0.5rem)] lg:px-5 lg:py-4 lg:pb-4">
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

        <div className="min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-3">
          <BookChaptersSidebar
            bookTitle={book.title}
            levelLabel={levelLabel}
            currentChapter={currentChapter}
            totalChapters={chapters.length}
            onChapterChange={changeChapter}
            loading={loading}
          />

          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
            {loading && (
              <div className="mb-3 shrink-0 text-right text-sm text-blue-600">Loading chapter...</div>
            )}
            {error && (
              <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden">
              <Reader article={article} containedScroll contentScrollRef={articleScrollRef} />
            </div>
          </div>
        </div>
      </div>

      <ChapterSelector
        currentChapter={currentChapter}
        totalChapters={chapters.length}
        onChapterChange={changeChapter}
        showDesktop={false}
      />

      {showMarkAsRead && (
        <button
          type="button"
          onClick={handleMarkAsRead}
          className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all ${
            isRead ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          {isRead ? 'Read' : 'Mark as read'}
        </button>
      )}
    </div>
  );
}
