'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type Article } from '@easy-reading/shared';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import ReaderShell from '@/components/ReaderShell';
import AnonymousReaderWarning from '@/components/reader/AnonymousReaderWarning';
import ReaderWorkspace from '@/components/reader/ReaderWorkspace';
import type { IELTSArticleListItem, IELTSReaderTestSummary } from '@/lib/ielts-types';
import { getIELTSPassageReaderUrl, ieltsMonthLabels, ieltsMonthOrder } from '@/lib/ielts-paths';
import { saveLastIELTSTestRoute } from '@/lib/ielts-storage';
import {
  createIELTSHistoryItem,
  isRouteRead,
  saveReadingHistoryItemAsync,
} from '@/utils/reading-history';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';

type IELTSTestReaderClientProps = {
  summary: IELTSReaderTestSummary;
  passages: IELTSArticleListItem[];
  articlesById: Record<string, Article>;
  allTests: Array<{
    year: string;
    month: string;
    test: string;
    firstPassage: string;
  }>;
  initialPassage: string;
};

export default function IELTSTestReaderClient({
  summary,
  passages,
  articlesById,
  allTests,
  initialPassage,
}: IELTSTestReaderClientProps) {
  const router = useRouter();
  const { t } = useLocaleContext();
  const readerIndexText = (key: string) => t(`website.readerIndex.${key}`);
  const pathname = usePathname();
  const articleScrollRef = useRef<HTMLDivElement>(null);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const { readerVocabularyData } = useVocabularyBooks({ loadWordDetails: true });
  const activePassage =
    passages.find((passage) => passage.passage === initialPassage) || passages[0] || null;
  const activePassageIndex = activePassage
    ? passages.findIndex((passage) => passage.id === activePassage.id)
    : -1;
  const activeArticle = activePassage ? articlesById[activePassage.id] || null : null;
  const activeRouteUrl = activePassage
    ? getIELTSPassageReaderUrl(summary.year, summary.month, summary.test, activePassage.passage)
    : '';
  const previousPassage = activePassageIndex > 0 ? passages[activePassageIndex - 1] : null;
  const nextPassage = activePassageIndex >= 0 && activePassageIndex < passages.length - 1
    ? passages[activePassageIndex + 1]
    : null;

  useEffect(() => {
    if (!activePassage) {
      return;
    }

    saveLastIELTSTestRoute(activeRouteUrl);
  }, [activePassage, activeRouteUrl]);

  useEffect(() => {
    if (!activeArticle) {
      return;
    }

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
  }, [activeArticle]);

  useEffect(() => {
    let cancelled = false;

    const loadReadState = async () => {
      const nextIsRead = await isRouteRead(activeRouteUrl);
      if (!cancelled) {
        setIsRead(nextIsRead);
      }
    };

    void loadReadState();

    return () => {
      cancelled = true;
    };
  }, [activeRouteUrl]);

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

    const targetTest = allTests.find(
      (entry) => entry.year === year && entry.month === nextMonth && entry.test === nextTest,
    );
    if (!targetTest) {
      return;
    }

    router.push(getIELTSPassageReaderUrl(year, nextMonth, nextTest, targetTest.firstPassage));
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

    const targetTest = allTests.find(
      (entry) => entry.year === summary.year && entry.month === month && entry.test === nextTest,
    );
    if (!targetTest) {
      return;
    }

    router.push(getIELTSPassageReaderUrl(summary.year, month, nextTest, targetTest.firstPassage));
  };

  const handleTestChange = (test: string) => {
    const targetTest = allTests.find(
      (entry) => entry.year === summary.year && entry.month === summary.month && entry.test === test,
    );
    if (!targetTest) {
      return;
    }

    router.push(
      getIELTSPassageReaderUrl(summary.year, summary.month, test, targetTest.firstPassage),
    );
  };

  const handleMarkAsRead = async () => {
    if (!activeArticle || !activePassage) {
      return;
    }

    await saveReadingHistoryItemAsync(
      createIELTSHistoryItem({
        routeUrl: activeRouteUrl,
        title: activeArticle.title,
        subtitle: `${summary.year} ${ieltsMonthLabels[summary.month] || summary.month} Test ${summary.test} · Passage ${activePassage.passage}`,
        wordCount: activeArticle.word_count,
        readingTime: activeArticle.reading_time,
      }),
    );
    setIsRead(true);
  };

  const handlePassageChange = (passage: IELTSArticleListItem) => {
    const nextRoute = getIELTSPassageReaderUrl(
      summary.year,
      summary.month,
      summary.test,
      passage.passage,
    );

    if (nextRoute === pathname) {
      return;
    }

    router.replace(nextRoute, { scroll: false });
  };

  return (
    <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <ReaderShell className="flex h-full min-h-0 flex-col py-3 pb-[calc(88px+0.5rem)] sm:py-4 sm:pb-[calc(88px+0.5rem)] xl:pb-4">
        <div className="mb-3 shrink-0 rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-sm sm:p-5">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
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
          {/* <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {summary.year} {ieltsMonthLabels[summary.month] || summary.month} Test {summary.test}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {summary.source} · {summary.articleCount} passage{summary.articleCount === 1 ? '' : 's'}
          </p> */}
        </div>

        <ReaderWorkspace
          article={activeArticle}
          containedScroll
          contentScrollRef={articleScrollRef}
          outerClassName="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)]"
          navigation={{
            title: readerIndexText('passagesTitle'),
            description: readerIndexText('passagesDescription'),
            items: passages.map((passage) => ({
              id: passage.id,
              overline: `${readerIndexText('passage')} ${passage.passage}`,
              title: passage.title,
              meta: `${passage.readingTime} ${readerIndexText('minute')}`,
              active: passage.id === activePassage?.id,
              onSelect: () => handlePassageChange(passage),
            })),
            previous: {
              label: 'Prev',
              onSelect: () => previousPassage && handlePassageChange(previousPassage),
              disabled: !previousPassage,
            },
            next: {
              label: 'Next',
              onSelect: () => nextPassage && handlePassageChange(nextPassage),
              disabled: !nextPassage,
            },
            currentLabel: activePassage ? `${readerIndexText('passage')} ${activePassage.passage} / ${passages.length}` : '',
          }}
          warning={<AnonymousReaderWarning />}
          floatingAction={showMarkAsRead && activeArticle ? (
            <button
              type="button"
              onClick={handleMarkAsRead}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all ${
                isRead ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {isRead ? 'Read' : 'Mark as read'}
            </button>
          ) : null}
          emptyState={(
            <div className="rounded-2xl bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              Select a passage to start reading.
            </div>
          )}
          panelClassName="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          readerContainerClassName="min-h-0 flex-1 overflow-hidden"
          vocabularyHighlightColorByWord={readerVocabularyData.vocabularyHighlightColorByWord}
          vocabularyBookIdsByWord={readerVocabularyData.vocabularyBookIdsByWord}
          vocabularyWordDetailsByWord={readerVocabularyData.vocabularyWordDetailsByWord}
        />
      </ReaderShell>
    </div>
  );
}
