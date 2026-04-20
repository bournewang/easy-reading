'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { IELTSArticleListItem } from '@/lib/ielts-types';
import {
  getIELTSPassageReaderUrl,
  ieltsMonthLabels,
  ieltsMonthOrder,
  type IELTSMonthKey,
} from '@/lib/ielts-paths';
import { readLastIELTSTestRoute } from '@/lib/ielts-storage';
import { isRouteRead } from '@/utils/reading-history';

type IELTSPageClientProps = {
  articles: IELTSArticleListItem[];
};

const yearsFromArticles = (articles: IELTSArticleListItem[]) =>
  Array.from(new Set(articles.map((article) => article.year)));

const testsFromArticles = (articles: IELTSArticleListItem[]) =>
  Array.from(new Set(articles.map((article) => `${article.year}-${article.month}-${article.test}`)));

export default function IELTSPageClient({ articles }: IELTSPageClientProps) {
  const years = useMemo(() => yearsFromArticles(articles), [articles]);
  const totalTests = useMemo(() => testsFromArticles(articles).length, [articles]);
  const [selectedYear, setSelectedYear] = useState(years[0] || '');
  const [selectedMonth, setSelectedMonth] = useState<IELTSMonthKey | ''>('');
  const [selectedTest, setSelectedTest] = useState('');
  const [readRoutes, setReadRoutes] = useState<Set<string>>(new Set());
  const [resumeRoute, setResumeRoute] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    const loadReadRoutes = async () => {
      const nextReadRoutes = new Set<string>();

      await Promise.all(
        articles.map(async (article) => {
          const articleRoute = getIELTSPassageReaderUrl(article.year, article.month, article.test, article.passage);
          if (await isRouteRead(articleRoute)) {
            nextReadRoutes.add(articleRoute);
          }
        }),
      );

      if (!cancelled) {
        setReadRoutes(nextReadRoutes);
      }
    };

    void loadReadRoutes();

    return () => {
      cancelled = true;
    };
  }, [articles]);

  useEffect(() => {
    const savedRoute = readLastIELTSTestRoute();
    if (!savedRoute) {
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(savedRoute, window.location.origin);
    } catch {
      return;
    }

    const matched = parsed.pathname.match(/^\/ielts-reader\/([^/]+)\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
    if (!matched) {
      return;
    }

    const [, year, month, test] = matched;
    const exists = articles.some(
      (article) =>
        article.year === year &&
        article.month === month &&
        article.test === test,
    );

    if (!exists) {
      return;
    }

    setSelectedYear(year);
    setSelectedMonth(month as IELTSMonthKey);
    setSelectedTest(test);
    setResumeRoute(`${parsed.pathname}${parsed.search}`);
  }, [articles]);

  const availableMonths = useMemo(() => {
    if (!selectedYear) {
      return [];
    }

    const months = Array.from(
      new Set(
        articles
          .filter((article) => article.year === selectedYear)
          .map((article) => article.month),
      ),
    );

    return ieltsMonthOrder.filter((month) => months.includes(month));
  }, [articles, selectedYear]);

  const availableTests = useMemo(() => {
    if (!selectedYear || !selectedMonth) {
      return [];
    }

    return Array.from(
      new Set(
        articles
          .filter((article) => article.year === selectedYear && article.month === selectedMonth)
          .map((article) => article.test),
      ),
    ).sort((a, b) => Number(a) - Number(b));
  }, [articles, selectedMonth, selectedYear]);

  const visibleArticles = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedTest) {
      return [];
    }

    return articles.filter(
      (article) =>
        article.year === selectedYear &&
        article.month === selectedMonth &&
        article.test === selectedTest,
    );
  }, [articles, selectedMonth, selectedTest, selectedYear]);

  const selectedTestLabel =
    selectedYear && selectedMonth && selectedTest
      ? `${selectedYear} ${ieltsMonthLabels[selectedMonth] || selectedMonth} · Test ${selectedTest}`
      : null;

  const handleYearChange = (year: string) => {
    if (year === selectedYear) {
      return;
    }

    setSelectedYear(year);
    setSelectedMonth('');
    setSelectedTest('');
  };

  const handleMonthChange = (month: IELTSMonthKey) => {
    if (!availableMonths.includes(month)) {
      return;
    }

    setSelectedMonth(month);
    setSelectedTest('');
  };

  const handleTestChange = (test: string) => {
    setSelectedTest(test);
  };

  useEffect(() => {
    if (!availableMonths.length) {
      setSelectedMonth('');
      return;
    }

    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (!availableTests.length) {
      setSelectedTest('');
      return;
    }

    if (!availableTests.includes(selectedTest)) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest]);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="w-full py-4 sm:py-5">
        <div className="mb-6 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#1f2937_0%,#0f766e_52%,#155e75_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="grid gap-5 px-6 py-8 text-white sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] lg:items-end lg:px-10">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-teal-100/90">IELTS Reading</p>
              <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[48px]">Find the right test, then pick your passage</h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-[1.5] tracking-[-0.24px] text-white/72 md:text-[16px]">
                Stay on the IELTS list page while you filter by year, month, and test. When you are ready, open a specific passage from the list below.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[24px] bg-sky-100/15 p-3.5 ring-1 ring-sky-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Years</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{years.length}</p>
              </div>
              <div className="rounded-[24px] bg-indigo-100/15 p-3.5 ring-1 ring-indigo-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Tests</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{totalTests}</p>
              </div>
              <div className="rounded-[24px] bg-emerald-100/15 p-3.5 ring-1 ring-emerald-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Read</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{readRoutes.size}</p>
              </div>
            </div>
          </div>

          {false && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/6 px-6 py-4 sm:px-8 lg:px-10">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/56">Current Selection</p>
                <p className="mt-1 text-[14px] font-medium tracking-[-0.22px] text-white/80">
                  {selectedTestLabel || 'Choose a year, month, and test to start browsing.'}
                </p>
              </div>

              {resumeRoute && (
                <Link
                  href={resumeRoute}
                  className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[14px] font-medium tracking-[-0.22px] text-[#1d1d1f] transition-colors hover:bg-white/90"
                >
                  Continue last passage
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[0.85fr_1.3fr_0.85fr]">
          <section className="rounded-[28px] border border-sky-100 bg-sky-50/55 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 1</p>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Choose year</h2>
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearChange(year)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedYear === year
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-indigo-100 bg-indigo-50/55 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 2</p>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Choose month</h2>
            <div className="flex flex-wrap gap-2">
              {ieltsMonthOrder.map((month) => {
                const isAvailable = availableMonths.includes(month);

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthChange(month)}
                    disabled={!isAvailable}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      !isAvailable
                        ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                        : selectedMonth === month
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {ieltsMonthLabels[month] || month}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-emerald-50/55 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 3</p>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Choose test</h2>
            <div className="flex flex-wrap gap-2">
              {availableTests.map((test) => (
                <button
                  key={test}
                  type="button"
                  onClick={() => handleTestChange(test)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTest === test
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  Test {test}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          {selectedYear && selectedMonth && selectedTest && (
            <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              This page stays on the test list so you can compare passages first. Open the exact passage you want from the cards below.
            </div>
          )}

          {visibleArticles.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              No passages available for the current selection yet.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article) => {
                const articleRoute = getIELTSPassageReaderUrl(
                  article.year,
                  article.month,
                  article.test,
                  article.passage,
                );
                const isRead = readRoutes.has(articleRoute);

                return (
                  <Link
                    key={article.id}
                    href={articleRoute}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Passage {article.passage}
                      </span>
                      {isRead && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Read
                        </span>
                      )}
                    </div>

                    <h3 className="line-clamp-3 text-base font-semibold text-slate-900 group-hover:text-sky-700 sm:text-lg">
                      {article.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>{article.wordCount.toLocaleString()} words</span>
                      <span>{article.readingTime} min read</span>
                    </div>

                    <div className="mt-4 inline-flex items-center text-sm font-semibold text-sky-700">
                      Open passage
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
