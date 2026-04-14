'use client';

import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { formatMessage } from '@/lib/i18n';

type LevelData = {
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
    assetCoverImg: string | null;
  }>;
};

type LevelTab = {
  id: string;
  shortLabel: string;
};

export function BookLevelPageClient({ levelData, levels }: { levelData: LevelData; levels: LevelTab[] }) {
  const { t } = useLocaleContext();
  const levelText = (key: string) => t(`website.bookLevelPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.12),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/books" className="font-medium hover:text-blue-600">
            {common('books')}
          </Link>
          <span>/</span>
          <span className="text-slate-700">{levelData.shortLabel}</span>
        </nav>

        <section className="overflow-hidden rounded-[34px] border border-white/60 bg-white/80 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="grid gap-8 border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white sm:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100 ring-1 ring-white/15">
                {formatMessage(levelText('collection'), { level: levelData.shortLabel })}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{levelData.label}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">{levelData.description}</p>
              <p className="mt-4 text-sm text-slate-300">
                {formatMessage(levelText('levelSummary'), { count: levelData.total })}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">{levelText('booksInLevel')}</p>
                <p className="mt-2 text-4xl font-semibold text-white">{levelData.total}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{levelText('booksInLevelBody')}</p>
              </div>
              <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">{levelText('bestFor')}</p>
                <p className="mt-2 text-lg font-semibold text-white">{levelText('bestForTitle')}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{levelText('bestForBody')}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 lg:px-10">
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => {
                const isActive = level.id === levelData.id;

                return (
                  <Link
                    key={level.id}
                    href={`/books/${level.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {level.shortLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {levelData.books.map((book) => (
            <Link
              key={book.slug}
              href={`/books/${levelData.id}/${book.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-white/60 bg-white/88 p-4 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_28px_80px_-36px_rgba(37,99,235,0.35)]"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-100 to-slate-200">
                {book.assetCoverImg ? (
                  <img
                    src={book.assetCoverImg}
                    alt={`Cover of ${book.title}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-400">
                    {common('noCover')}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  {levelData.shortLabel}
                </span>
                <span className="text-xs font-medium text-slate-500">{book.chapterCount} {common('chapter_other')}</span>
              </div>

              <h2 className="mt-4 text-xl font-semibold leading-7 text-slate-950">{book.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {formatMessage(levelText('byAuthor'), { author: book.author || common('unknownAuthor') })}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {levelText('supportBody')}
              </div>

              <span className="mt-5 inline-flex text-sm font-semibold text-blue-600">{common('openBook')}</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
