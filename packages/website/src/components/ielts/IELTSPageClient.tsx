'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { IELTSArticleListItem } from '@/lib/ielts-types';
import {
  getIELTSTestReaderUrl,
  ieltsMonthLabels,
  ieltsMonthOrder,
  type IELTSMonthKey,
} from '@/lib/ielts-paths';

type IELTSPageClientProps = {
  articles: IELTSArticleListItem[];
};

const yearsFromArticles = (articles: IELTSArticleListItem[]) =>
  Array.from(new Set(articles.map((article) => article.year)));

export default function IELTSPageClient({ articles }: IELTSPageClientProps) {
  const years = useMemo(() => yearsFromArticles(articles), [articles]);
  const [selectedYear, setSelectedYear] = useState(years[0] || '');
  const [selectedMonth, setSelectedMonth] = useState<IELTSMonthKey | ''>('');
  const [selectedTest, setSelectedTest] = useState('');
  const [readArticles, setReadArticles] = useState<string[]>([]);

  useEffect(() => {
    setReadArticles(JSON.parse(localStorage.getItem('readArticles') || '[]'));
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">IELTS Reading</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Browse by year, month, and test</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Choose an exam year, narrow it down to the month, then pick the test number to see the passages ready for Reader.
          </p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 1</p>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Choose year</h2>
            <div className="flex flex-wrap gap-3">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearChange(year)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 2</p>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Choose month</h2>
            <div className="flex flex-wrap gap-3">
              {ieltsMonthOrder.map((month) => {
                const isAvailable = availableMonths.includes(month);

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthChange(month)}
                    disabled={!isAvailable}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step 3</p>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Choose test</h2>
            <div className="flex flex-wrap gap-3">
              {availableTests.map((test) => (
                <button
                  key={test}
                  type="button"
                  onClick={() => handleTestChange(test)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Articles</h2>
              <p className="text-sm text-slate-500">
                {selectedYear && selectedMonth && selectedTest
                  ? `${selectedYear} ${ieltsMonthLabels[selectedMonth] || selectedMonth} · Test ${selectedTest}`
                  : 'Select year, month, and test to view passages'}
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {visibleArticles.length} passage{visibleArticles.length === 1 ? '' : 's'}
            </span>
          </div>

          {selectedYear && selectedMonth && selectedTest && (
            <div className="mb-5">
              <Link
                href={getIELTSTestReaderUrl(selectedYear, selectedMonth, selectedTest)}
                className="inline-flex items-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                Open Full Test Reader
              </Link>
            </div>
          )}

          {visibleArticles.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No passages available for the current selection yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article) => {
                const isRead = readArticles.includes(`ielts://${article.id}`);

                return (
                  <Link
                    key={article.id}
                    href={getIELTSTestReaderUrl(article.year, article.month, article.test)}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Passage {article.passage}
                      </span>
                      {isRead && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Read
                        </span>
                      )}
                    </div>

                    <h3 className="line-clamp-3 text-lg font-semibold text-slate-900 group-hover:text-sky-700">
                      {article.title}
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>{article.wordCount.toLocaleString()} words</span>
                      <span>{article.readingTime} min read</span>
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
