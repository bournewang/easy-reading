'use client';

import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { formatMessage } from '@/lib/i18n';

type Level = {
  id: string;
  shortLabel: string;
  label: string;
  description: string;
  total: number;
  books: Array<{
    slug: string;
    title: string;
    author: string;
    chapterCount: number;
  }>;
};

export function BooksIndexPageClient({ levels }: { levels: Level[] }) {
  const { t } = useLocaleContext();
  const booksText = (key: string) => t(`website.booksPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <header className="mb-12 max-w-4xl">
          <h1 className="text-4xl font-bold text-gray-900">{booksText('title')}</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">{booksText('subtitle')}</p>
        </header>

        <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">{booksText('chooseLevel')}</h2>
          <p className="mt-3 text-gray-600">{booksText('chooseLevelBody')}</p>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {levels.map((level) => (
            <section key={level.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                {level.shortLabel}
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                <Link href={`/books/${level.id}`} className="hover:text-blue-600">
                  {level.label}
                </Link>
              </h2>
              <p className="mt-3 text-gray-600">{level.description}</p>
              <p className="mt-4 text-sm text-gray-500">
                {formatMessage(booksText('booksAvailable'), { count: level.total })}
              </p>

              <div className="mt-6 space-y-3">
                {level.books.slice(0, 3).map((book) => (
                  <Link
                    key={book.slug}
                    href={`/books/${level.id}/${book.slug}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{book.title}</h3>
                      <p className="text-sm text-gray-500">{book.author || common('unknownAuthor')}</p>
                    </div>
                    <span className="text-sm text-blue-600">{book.chapterCount} {common('chapter_other')}</span>
                  </Link>
                ))}
              </div>

              <Link
                href={`/books/${level.id}`}
                className="mt-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {formatMessage(booksText('exploreLevel'), { level: level.shortLabel })}
              </Link>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
