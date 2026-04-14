'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChapterSelector } from '@/components/ChapterSelector';
import BookChaptersSidebar from '@/components/books/BookChaptersSidebar';
import type { BookChapterManifestItem, BookRecord } from '@/lib/books';
import { Reader, type Article, type Paragraph } from '@easy-reading/shared';

type BookReaderClientProps = {
  book: BookRecord;
  chapters: BookChapterManifestItem[];
  levelLabel: string;
  initialArticle: Article;
};

type BookChapterResource = BookChapterManifestItem & {
  content: string;
};

const DEFAULT_BOOKS_BASE_URL = 'http://localhost:3000/books';

function getBooksBaseUrl() {
  const configuredBaseUrl = (process.env.NEXT_PUBLIC_BOOKS_URL || DEFAULT_BOOKS_BASE_URL).replace(/\/$/, '');

  if (/\/books-json$/i.test(configuredBaseUrl)) {
    return configuredBaseUrl.replace(/\/books-json$/i, '/books');
  }

  return configuredBaseUrl;
}

function getBooksJsonBaseUrl() {
  const configuredBaseUrl = (process.env.NEXT_PUBLIC_BOOKS_URL || DEFAULT_BOOKS_BASE_URL).replace(/\/$/, '');

  if (/\/books-json$/i.test(configuredBaseUrl)) {
    return configuredBaseUrl;
  }

  const booksBaseUrl = getBooksBaseUrl();

  if (/\/books$/i.test(booksBaseUrl)) {
    return booksBaseUrl.replace(/\/books$/i, '/books-json');
  }

  return `${booksBaseUrl}/books-json`;
}

export default function BookReaderClient({
  book,
  chapters,
  levelLabel,
  initialArticle,
}: BookReaderClientProps) {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [article, setArticle] = useState<Article>(initialArticle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildClientArticleFromChapter = (chapter: BookChapterResource): Article => {
    const paragraphs: Record<number, Paragraph> = {};

    chapter.content
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

    const plainText = Object.values(paragraphs)
      .filter((paragraph) => paragraph.type === 'text')
      .map((paragraph) => paragraph.content)
      .join(' ');
    const wordCount =
      chapter.wordCount ||
      plainText
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

    return {
      title: `${book.title} · Chapter ${chapter.chapterIndex + 1}/${book.chapterCount}`,
      site_name: `${book.author || 'Unknown author'} · ${levelLabel}`,
      url: `book://${book.id}/${chapter.id}`,
      word_count: wordCount,
      paragraphs,
      unfamiliar_words: [],
      reading_time: chapter.readingTime || Math.max(1, Math.ceil(wordCount / 150)),
      created_at: new Date().toISOString(),
    };
  };

  const changeChapter = async (index: number) => {
    if (index === currentChapter || index < 0 || index >= chapters.length) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const chapterMeta = chapters[index];
      const booksJsonBaseUrl = getBooksJsonBaseUrl();
      const response = await fetch(
        `${booksJsonBaseUrl}/chapters/${encodeURIComponent(chapterMeta.id)}.json`,
        {
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load chapter ${index + 1}`);
      }

      const chapter = (await response.json()) as BookChapterResource;

      setCurrentChapter(index);
      setArticle(buildClientArticleFromChapter(chapter));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (chapterError) {
      setError(chapterError instanceof Error ? chapterError.message : 'Failed to load chapter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-10 pb-[calc(120px+1rem)] sm:pb-[calc(144px+1rem)] lg:pb-10">
        <nav className="mb-4 text-sm text-gray-500">
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

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <BookChaptersSidebar
            bookTitle={book.title}
            levelLabel={levelLabel}
            currentChapter={currentChapter}
            totalChapters={chapters.length}
            onChapterChange={changeChapter}
            loading={loading}
          />

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            {loading && (
              <div className="mb-4 text-right text-sm text-blue-600">Loading chapter...</div>
            )}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Reader article={article} />
          </div>
        </div>
      </div>

      <ChapterSelector
        currentChapter={currentChapter}
        totalChapters={chapters.length}
        onChapterChange={changeChapter}
        showDesktop={false}
      />
    </div>
  );
}
