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
    firstChapterNumber: number | null;
  }>;
};

export function BooksIndexPageClient({ levels }: { levels: Level[] }) {
  const { t } = useLocaleContext();
  const booksText = (key: string) => t(`website.booksPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  return (
    <div className="bg-[#f5f5f7] py-8 sm:py-10">
      <div className="w-full">
        <header className="mb-6 rounded-[36px] bg-[linear-gradient(135deg,#312e81_0%,#4c1d95_52%,#4338ca_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:px-8 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-indigo-100/90">Books</p>
              <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[48px]">{booksText('title')}</h1>
              <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.24px] text-white/72 md:text-[16px]">{booksText('subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-indigo-100/15 p-3.5 ring-1 ring-indigo-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Levels</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{levels.length}</p>
              </div>
              <div className="rounded-[24px] bg-violet-100/15 p-3.5 ring-1 ring-violet-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Books</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{levels.reduce((sum, level) => sum + level.total, 0)}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-10 rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <h2 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">{booksText('chooseLevel')}</h2>
          <p className="mt-3 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">{booksText('chooseLevelBody')}</p>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {levels.map((level) => (
            <section key={level.id} className="rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="mb-3 inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-[14px] font-medium tracking-[-0.22px] text-[#0066cc]">
                {level.shortLabel}
              </div>
              <h2 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">
                <Link href={`/books/${level.id}`} className="hover:text-[#0066cc]">
                  {level.label}
                </Link>
              </h2>
              <p className="mt-3 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">{level.description}</p>
              <p className="mt-4 text-[14px] tracking-[-0.22px] text-black/48">
                {formatMessage(booksText('booksAvailable'), { count: level.total })}
              </p>

              <div className="mt-6 space-y-3">
                {level.books.slice(0, 3).map((book) => (
                  <Link
                    key={book.slug}
                    href={`/books/${level.id}/${book.slug}/${book.firstChapterNumber ?? 1}`}
                    className="flex items-center justify-between rounded-[22px] border border-black/6 px-4 py-3 transition hover:border-[#0071e3]/20 hover:bg-[#f5f9ff]"
                  >
                    <div>
                      <h3 className="font-medium text-[#1d1d1f]">{book.title}</h3>
                      <p className="text-[14px] tracking-[-0.22px] text-black/48">{book.author || common('unknownAuthor')}</p>
                    </div>
                    <span className="text-[14px] font-medium tracking-[-0.22px] text-[#0066cc]">{book.chapterCount} {common('chapter_other')}</span>
                  </Link>
                ))}
              </div>

              <Link
                href={`/books/${level.id}`}
                className="mt-6 inline-flex text-[14px] font-medium tracking-[-0.22px] text-[#0066cc] hover:text-[#0071e3]"
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
