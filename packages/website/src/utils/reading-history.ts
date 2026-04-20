import type { Article } from '@easy-reading/shared';
import { getBookChapterReaderUrl, getIELTSPassageReaderUrl } from '@/lib/reading-routes';
import { getStoredAuthToken } from '@/utils/auth-token';
import { api } from '@/utils/api';
import { fetchAnonymousLimits, getCachedAnonymousLimits } from '@/utils/anonymous-limits';

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

type HistoryCacheState = {
  token: string | null;
  items: ReadingHistoryItem[] | null;
  promise: Promise<ReadingHistoryItem[]> | null;
};

let historyCache: HistoryCacheState = {
  token: null,
  items: null,
  promise: null,
};

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

function capHistoryItems(items: ReadingHistoryItem[]) {
  const limit = Math.max(0, getCachedAnonymousLimits().historyLimit);
  return sortHistory(items).slice(0, limit);
}

function setHistoryCache(items: ReadingHistoryItem[], token = getStoredAuthToken()) {
  historyCache = {
    token,
    items: capHistoryItems(items),
    promise: null,
  };
}

export function invalidateReadingHistoryCache() {
  historyCache = {
    token: getStoredAuthToken(),
    items: null,
    promise: null,
  };
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
  return capHistoryItems(
    stored
      .map((item) => normalizeHistoryItem(item))
      .filter((item): item is ReadingHistoryItem => Boolean(item)),
  );
}

function writeStoredHistory(items: ReadingHistoryItem[]) {
  if (!isBrowser()) {
    return;
  }

  const sorted = capHistoryItems(items);
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
        : `/news-reader?url=${encodeURIComponent(url)}`;
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

function readLocalHistory() {
  return migrateLegacyHistory();
}

export function getReadingHistory() {
  return readLocalHistory();
}

export async function getReadingHistoryAsync(options?: { forceRefresh?: boolean }) {
  const token = getStoredAuthToken();
  if (!token) {
    void fetchAnonymousLimits();
    const localHistory = readLocalHistory();
    setHistoryCache(localHistory, null);
    return localHistory;
  }

  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh && historyCache.token === token && historyCache.items) {
    return historyCache.items;
  }

  if (!forceRefresh && historyCache.token === token && historyCache.promise) {
    return historyCache.promise;
  }

  const request = api
    .get<ReadingHistoryItem[]>('/history')
    .then((response) => {
      const items = sortHistory(
        response.data
          .map((item) => normalizeHistoryItem(item))
          .filter((item): item is ReadingHistoryItem => Boolean(item)),
      );
      setHistoryCache(items, token);
      return items;
    })
    .catch((error) => {
      invalidateReadingHistoryCache();
      throw error;
    });

  historyCache = {
    token,
    items: null,
    promise: request,
  };

  return request;
}

export function saveReadingHistoryItem(item: ReadingHistoryItem) {
  const current = readLocalHistory();
  const next = [item, ...current.filter((entry) => entry.key !== item.key)];
  writeStoredHistory(next);
  setHistoryCache(capHistoryItems(next), null);
}

export async function saveReadingHistoryItemAsync(item: ReadingHistoryItem) {
  const token = getStoredAuthToken();
  if (!token) {
    await fetchAnonymousLimits();
    saveReadingHistoryItem(item);
    return item;
  }

  const response = await api.post<ReadingHistoryItem>('/history', item);
  const savedItem = normalizeHistoryItem(response.data) || item;

  if (historyCache.token === token && historyCache.items) {
    setHistoryCache(mergeHistoryItems(historyCache.items, [savedItem]), token);
  } else {
    invalidateReadingHistoryCache();
  }

  return savedItem;
}

export async function syncReadingHistoryAsync(items: ReadingHistoryItem[]) {
  const normalizedItems = items
    .map((item) => normalizeHistoryItem(item))
    .filter((item): item is ReadingHistoryItem => Boolean(item));
  const token = getStoredAuthToken();

  if (!token) {
    await fetchAnonymousLimits();
    const merged = mergeHistoryItems(readLocalHistory(), normalizedItems);
    writeStoredHistory(merged);
    const capped = capHistoryItems(merged);
    setHistoryCache(capped, null);
    return capped;
  }

  const response = await api.post<ReadingHistoryItem[]>('/history/sync', {
    items: normalizedItems,
  });
  const merged = sortHistory(
    response.data
      .map((item) => normalizeHistoryItem(item))
      .filter((item): item is ReadingHistoryItem => Boolean(item)),
  );
  setHistoryCache(merged, token);
  return merged;
}

export function clearLocalReadingHistory() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_READ_ARTICLES_KEY);

  if (!getStoredAuthToken()) {
    invalidateReadingHistoryCache();
  }
}

export function createHistoryItem(item: ReadingHistoryItem): ReadingHistoryItem {
  return {
    ...item,
    key: migrateHistoryRouteUrl(item.key),
    routeUrl: migrateHistoryRouteUrl(item.routeUrl),
  };
}

export function createNewsHistoryItem({
  article,
  routeUrl,
  timestamp = Date.now(),
}: {
  article: Pick<Article, 'title' | 'site_name' | 'url' | 'reading_time' | 'word_count'>;
  routeUrl?: string;
  timestamp?: number;
}) {
  const resolvedRouteUrl = routeUrl || `/news-reader?url=${encodeURIComponent(article.url)}`;

  return createHistoryItem({
    key: resolvedRouteUrl,
    kind: 'news',
    routeUrl: resolvedRouteUrl,
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

export async function isRouteRead(routeUrl: string) {
  return (await getReadingHistoryAsync()).some((item) => item.routeUrl === routeUrl);
}

export async function isSourceRead(sourceUrl: string) {
  return (await getReadingHistoryAsync()).some((item) => item.sourceUrl === sourceUrl);
}

export function migrateHistoryRouteUrl(routeUrl: string) {
  const readerIeltsMatch = routeUrl.match(/^\/reader\?articleId=([^&]+)$/);
  if (readerIeltsMatch) {
    const [, articleId] = readerIeltsMatch;
    return `/reader?articleId=${articleId}`;
  }

  const readerNewsMatch = routeUrl.match(/^\/reader\?(newsId|url)=(.+)$/);
  if (readerNewsMatch) {
    const [, key, value] = readerNewsMatch;
    if (key === 'newsId') {
      return `/news-reader/${value}`;
    }
    return `/news-reader?${key}=${value}`;
  }

  const newsReaderQueryMatch = routeUrl.match(/^\/news-reader\?newsId=(.+)$/);
  if (newsReaderQueryMatch) {
    const [, slug] = newsReaderQueryMatch;
    return `/news-reader/${slug}`;
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
