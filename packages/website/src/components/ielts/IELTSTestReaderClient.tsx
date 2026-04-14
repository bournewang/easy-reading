'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Reader, type Article } from '@easy-reading/shared';
import type { IELTSArticleListItem, IELTSReaderTestSummary } from '@/lib/ielts-types';
import { getIELTSTestReaderUrl, ieltsMonthLabels, ieltsMonthOrder } from '@/lib/ielts-paths';

type IELTSTestReaderClientProps = {
  summary: IELTSReaderTestSummary;
  passages: IELTSArticleListItem[];
  articlesById: Record<string, Article>;
  allTests: Array<{
    year: string;
    month: string;
    test: string;
  }>;
};

export default function IELTSTestReaderClient({
  summary,
  passages,
  articlesById,
  allTests,
}: IELTSTestReaderClientProps) {
  const router = useRouter();
  const [selectedPassageId, setSelectedPassageId] = useState(passages[0]?.id || '');
  const activeArticle = selectedPassageId ? articlesById[selectedPassageId] || null : null;
  const availableYears = useMemo(
    () => Array.from(new Set(allTests.map((entry) => entry.year))).sort((a, b) => Number(a) - Number(b)),
    [allTests],
  );
  const availableMonths = useMemo(
    () =>
      ieltsMonthOrder.filter((month) =>
        allTests.some((entry) => entry.year === summary.year && entry.month === month),
      ),
    [allTests, summary.year],
  );
  const availableTests = useMemo(
    () =>
      Array.from(
        new Set(
          allTests
            .filter((entry) => entry.year === summary.year && entry.month === summary.month)
            .map((entry) => entry.test),
        ),
      ).sort((a, b) => Number(a) - Number(b)),
    [allTests, summary.month, summary.year],
  );

  const handleYearChange = (year: string) => {
    const monthsForYear = Array.from(
      new Set(allTests.filter((entry) => entry.year === year).map((entry) => entry.month)),
    );
    const nextMonth = monthsForYear.includes(summary.month) ? summary.month : monthsForYear[0];
    const testsForMonth = Array.from(
      new Set(
        allTests
          .filter((entry) => entry.year === year && entry.month === nextMonth)
          .map((entry) => entry.test),
      ),
    ).sort((a, b) => Number(a) - Number(b));
    const nextTest = testsForMonth.includes(summary.test) ? summary.test : testsForMonth[0];

    if (!nextMonth || !nextTest) {
      return;
    }

    router.push(getIELTSTestReaderUrl(year, nextMonth, nextTest));
  };

  const handleMonthChange = (month: string) => {
    const testsForMonth = Array.from(
      new Set(
        allTests
          .filter((entry) => entry.year === summary.year && entry.month === month)
          .map((entry) => entry.test),
      ),
    ).sort((a, b) => Number(a) - Number(b));
    const nextTest = testsForMonth.includes(summary.test) ? summary.test : testsForMonth[0];

    if (!nextTest) {
      return;
    }

    router.push(getIELTSTestReaderUrl(summary.year, month, nextTest));
  };

  const handleTestChange = (test: string) => {
    router.push(getIELTSTestReaderUrl(summary.year, summary.month, test));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500">
            <Link href="/ielts" className="hover:text-sky-700">
              IELTS
            </Link>
            <span className="mx-1 text-slate-300">/</span>
            <div className="flex flex-wrap items-center gap-1">
              {availableYears.map((year) => {
                const isActive = year === summary.year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearChange(year)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
            <span className="mx-1 text-slate-300">/</span>
            <div className="flex flex-wrap items-center gap-1">
              {availableMonths.map((month) => {
                const isActive = month === summary.month;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthChange(month)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {ieltsMonthLabels[month] || month}
                  </button>
                );
              })}
            </div>
            <span className="mx-1 text-slate-300">/</span>
            <div className="flex flex-wrap items-center gap-1">
              {availableTests.map((test) => {
                const isActive = test === summary.test;
                return (
                  <button
                    key={test}
                    type="button"
                    onClick={() => handleTestChange(test)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    Test {test}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">IELTS Reader</p> */}
          <h1 className="text-3xl font-bold text-slate-900">
            {summary.year} {ieltsMonthLabels[summary.month] || summary.month} Test {summary.test}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {summary.source} · {summary.articleCount} passage{summary.articleCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Passages</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">All reading passages</h2>
            </div>

            <div className="space-y-3">
              {passages.map((passage) => {
                const isActive = passage.id === selectedPassageId;

                return (
                  <button
                    key={passage.id}
                    type="button"
                    onClick={() => setSelectedPassageId(passage.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-sky-200 bg-sky-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-sky-100 hover:bg-white'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Passage {passage.passage}
                      </span>
                      <span className="text-xs text-slate-500">{passage.readingTime} min</span>
                    </div>
                    <h3 className="text-sm font-semibold leading-6 text-slate-900">{passage.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{passage.wordCount.toLocaleString()} words</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {activeArticle ? (
              <Reader article={activeArticle} />
            ) : (
              <div className="rounded-2xl bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                Select a passage to start reading.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
