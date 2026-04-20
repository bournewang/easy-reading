'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { BookIcon, ClockIcon, Paginator } from '@easy-reading/shared';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { getReadingHistoryAsync, type ReadingHistoryItem } from '@/utils/reading-history';

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const { t } = useLocaleContext();
  const [articles, setArticles] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);
  const history = (key: string) => t(`website.historyPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const items = await getReadingHistoryAsync();
        if (!cancelled) {
          setArticles(items);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getCurrentPageArticles = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return articles.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="animate-spin text-2xl">⏳</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-8">
      <PageShell>
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#7c2d12_0%,#9a3412_52%,#b45309_100%)] px-6 py-8 text-white sm:px-8 sm:py-10">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-amber-100/90">{history('badge')}</p>
                <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[48px]">{history('title')}</h1>
                <p className="mt-3 text-[15px] leading-[1.5] tracking-[-0.24px] text-white/76 md:text-[16px]">
                  {history('subtitle')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-amber-100/15 p-3.5 ring-1 ring-amber-100/30">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">{history('articles')}</p>
                  <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{articles.length}</p>
                </div>
                <div className="rounded-[24px] bg-orange-100/15 p-3.5 ring-1 ring-orange-100/30">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">{history('readingTime')}</p>
                  <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{articles.reduce((sum, article) => sum + article.readingTime, 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {articles.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <p className="text-xl font-semibold text-slate-900">{history('emptyTitle')}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {history('emptyBody')}
                </p>
                <Link
                  href="/news"
                  className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {common('startReading')}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">{history('articles')}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{articles.length}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">{history('readingTime')}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {articles.reduce((sum, article) => sum + article.readingTime, 0)} {common('minute_other')}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 px-5 py-4">
                    <p className="text-sm text-slate-500">{history('wordsCovered')}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {articles.reduce((sum, article) => sum + article.wordCount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {getCurrentPageArticles().map((article) => (
                    <div key={article.key} className="rounded-[26px] border border-slate-200 bg-white p-2 transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                      <Link href={article.routeUrl} className="block rounded-[20px] px-4 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">{article.title}</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                          <div className="flex items-center space-x-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <span>{article.subtitle}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <BookIcon className="h-4 w-4" />
                            <span>{article.wordCount.toLocaleString()} words</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>{article.readingTime} {common('minute_other')}</span>
                          </div>
                          <span>{history('readOn')} {new Date(article.timestamp).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                <Paginator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="mt-8"
                />
              </>
            )}
          </div>
        </div>
      </PageShell>
    </div>
  );
}
