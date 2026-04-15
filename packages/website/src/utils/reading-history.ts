import type { Article } from '@easy-reading/shared';
import { getBookChapterReaderUrl, getIELTSPassageReaderUrl } from '@/lib/reading-routes';

export type ReadingHistoryKind = 'news' | 'ielts' | 'book';

export type ReadingHistoryItem = {
  key: string;
  kind: ReadingHistoryKind;
  routeUrl: string;
  title: string;
  subtitle: string;
  sourceUrl?: string;
  wordCount: number;
  readingTime: number;
  timestamp: number;
};

type LegacyStoredArticle = {
  title?: string;
  site_name?: string;
  reading_time?: number;
  word_count?: number;
  timestamp?: number;
};

const HISTORY_STORAGE_KEY = 'readingHistoryV2';
const LEGACY_READ_ARTICLES_KEY = 'readArticles';

function isBrowser() {
  return typeof window !== 'undefined';
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sortHistory(items: ReadingHistoryItem[]) {
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeHistoryItem(value: unknown): ReadingHistoryItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Partial<ReadingHistoryItem>;

  if (
    !item.key ||
    !item.kind ||
    !item.routeUrl ||
    !item.title ||
    !item.subtitle ||
    typeof item.wordCount !== 'number' ||
    typeof item.readingTime !== 'number' ||
    typeof item.timestamp !== 'number'
  ) {
    return null;
  }

  const routeUrl = migrateHistoryRouteUrl(item.routeUrl);

  return {
    key: routeUrl,
    kind: item.kind,
    routeUrl,
    title: item.title,
    subtitle: item.subtitle,
    sourceUrl: item.sourceUrl,
    wordCount: item.wordCount,
    readingTime: item.readingTime,
    timestamp: item.timestamp,
  };
}

function readStoredHistory(): ReadingHistoryItem[] {
  if (!isBrowser()) {
    return [];
  }

  const stored = safeParse<unknown[]>(window.localStorage.getItem(HISTORY_STORAGE_KEY), []);
  return sortHistory(
    stored
      .map((item) => normalizeHistoryItem(item))
      .filter((item): item is ReadingHistoryItem => Boolean(item)),
  );
}

function writeStoredHistory(items: ReadingHistoryItem[]) {
  if (!isBrowser()) {
    return;
  }

  const sorted = sortHistory(items);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sorted));

  const legacyReadArticles = sorted
    .map((item) => item.sourceUrl)
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index);

  window.localStorage.setItem(LEGACY_READ_ARTICLES_KEY, JSON.stringify(legacyReadArticles));
}

function mergeHistoryItems(existing: ReadingHistoryItem[], incoming: ReadingHistoryItem[]) {
  const merged = new Map<string, ReadingHistoryItem>();

  sortHistory([...existing, ...incoming]).forEach((item) => {
    if (!merged.has(item.key)) {
      merged.set(item.key, item);
    }
  });

  return sortHistory(Array.from(merged.values()));
}

function migrateLegacyHistory(): ReadingHistoryItem[] {
  if (!isBrowser()) {
    return [];
  }

  const existing = readStoredHistory();
  const legacyUrls = safeParse<string[]>(window.localStorage.getItem(LEGACY_READ_ARTICLES_KEY), []);

  if (!legacyUrls.length) {
    return existing;
  }

  const migrated = legacyUrls.map((url) => {
    const details = safeParse<LegacyStoredArticle>(
      window.localStorage.getItem(`article_${btoa(url).replace(/[/+=]/g, '')}`),
      {},
    );
    const isLegacyIelts = url.startsWith('ielts://');
    const isLegacyBook = url.startsWith('book://');
    const routeUrl = isLegacyIelts
      ? `/reader?articleId=${encodeURIComponent(url.replace(/^ielts:\/\//, ''))}`
      : isLegacyBook
        ? '/books'
        : `/reader?url=${encodeURIComponent(url)}`;
    const kind: ReadingHistoryKind = isLegacyIelts ? 'ielts' : isLegacyBook ? 'book' : 'news';
    const subtitle = isLegacyIelts
      ? details.site_name || 'IELTS Reading'
      : isLegacyBook
        ? details.site_name || 'Book'
        : details.site_name || 'Unknown Site';

    return createHistoryItem({
      key: routeUrl,
      kind,
      routeUrl,
      title: details.title || 'Untitled Article',
      subtitle,
      sourceUrl: url.startsWith('http') ? url : undefined,
      wordCount: details.word_count || 0,
      readingTime: details.reading_time || 0,
      timestamp: details.timestamp || 0,
    });
  });

  const merged = mergeHistoryItems(existing, migrated);

  if (merged.length !== existing.length) {
    writeStoredHistory(merged);
  }

  return merged;
}

export function getReadingHistory() {
  return migrateLegacyHistory();
}

export function saveReadingHistoryItem(item: ReadingHistoryItem) {
  const current = getReadingHistory();
  const next = [item, ...current.filter((entry) => entry.key !== item.key)];
  writeStoredHistory(next);
}

export function createHistoryItem(item: ReadingHistoryItem): ReadingHistoryItem {
  return item;
}

export function createNewsHistoryItem({
  article,
  timestamp = Date.now(),
}: {
  article: Pick<Article, 'title' | 'site_name' | 'url' | 'reading_time' | 'word_count'>;
  timestamp?: number;
}) {
  const routeUrl = `/reader?url=${encodeURIComponent(article.url)}`;

  return createHistoryItem({
    key: routeUrl,
    kind: 'news',
    routeUrl,
    title: article.title,
    subtitle: article.site_name,
    sourceUrl: article.url,
    wordCount: article.word_count,
    readingTime: article.reading_time,
    timestamp,
  });
}

export function createIELTSHistoryItem({
  routeUrl,
  title,
  subtitle,
  wordCount,
  readingTime,
  timestamp = Date.now(),
}: {
  routeUrl: string;
  title: string;
  subtitle: string;
  wordCount: number;
  readingTime: number;
  timestamp?: number;
}) {
  return createHistoryItem({
    key: routeUrl,
    kind: 'ielts',
    routeUrl,
    title,
    subtitle,
    wordCount,
    readingTime,
    timestamp,
  });
}

export function createBookHistoryItem({
  routeUrl,
  title,
  subtitle,
  wordCount,
  readingTime,
  timestamp = Date.now(),
}: {
  routeUrl: string;
  title: string;
  subtitle: string;
  wordCount: number;
  readingTime: number;
  timestamp?: number;
}) {
  return createHistoryItem({
    key: routeUrl,
    kind: 'book',
    routeUrl,
    title,
    subtitle,
    wordCount,
    readingTime,
    timestamp,
  });
}

export function isRouteRead(routeUrl: string) {
  return getReadingHistory().some((item) => item.routeUrl === routeUrl);
}

export function isSourceRead(sourceUrl: string) {
  return getReadingHistory().some((item) => item.sourceUrl === sourceUrl);
}

export function migrateHistoryRouteUrl(routeUrl: string) {
  const readerIeltsMatch = routeUrl.match(/^\/reader\?articleId=([^&]+)$/);
  if (readerIeltsMatch) {
    const [, articleId] = readerIeltsMatch;
    return `/reader?articleId=${articleId}`;
  }

  const ieltsMatch = routeUrl.match(/^\/ielts-reader\/([^/]+)\/([^/]+)\/([^/]+)\?passage=([^&]+)$/);
  if (ieltsMatch) {
    const [, year, month, test, passage] = ieltsMatch;
    return getIELTSPassageReaderUrl(
      decodeURIComponent(year),
      decodeURIComponent(month),
      decodeURIComponent(test),
      decodeURIComponent(passage),
    );
  }

  const bookMatch = routeUrl.match(/^\/books\/([^/]+)\/([^/?]+)\?chapter=(\d+)$/);
  if (bookMatch) {
    const [, level, slug, chapter] = bookMatch;
    return getBookChapterReaderUrl(
      decodeURIComponent(level),
      decodeURIComponent(slug),
      Number(chapter),
    );
  }

  return routeUrl;
}
