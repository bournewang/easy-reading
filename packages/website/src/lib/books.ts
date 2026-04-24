import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import type { Article, Paragraph } from '@easy-reading/shared';
import { BOOK_LEVELS, type BookLevel } from '@/lib/book-levels';
import { getBookChapterReaderUrl } from '@/lib/reading-routes';

export { BOOK_LEVELS };
export type { BookLevel };

export type BookManifestItem = {
  id: string;
  level: string;
  slug: string;
  title: string;
  author: string;
  coverImg: string | null;
  original?: string;
  bookDir?: string;
  sourceFile?: string;
  chapterCount: number;
  generatedAt?: string;
};

export type BookChapterManifestItem = {
  id: string;
  bookId: string;
  level: string;
  slug: string;
  title: string;
  author: string;
  chapterTitle: string;
  chapterFile: string;
  chapterIndex: number;
  chapterNumber: number;
  sourceChapterMarker?: string;
  sourceChapterTitle?: string;
  bookDir: string;
  coverImg: string | null;
  wordCount: number;
  readingTime: number;
};

type BookChapterManifestResourceItem = {
  id: string;
  bookId: string;
  chapterTitle: string;
  chapterFile: string;
  chapterIndex: number;
  chapterNumber: number;
  sourceChapterMarker?: string;
  sourceChapterTitle?: string;
  wordCount?: number;
  readingTime?: number;
};

type BookChaptersManifestResource = {
  id: string;
  level: string;
  slug: string;
  title: string;
  author: string;
  coverImg: string | null;
  bookDir?: string;
  sourceFile?: string;
  chapterCount: number;
  generatedAt?: string;
  chapters: BookChapterManifestResourceItem[];
};

export type BookChapterResource = BookChapterManifestItem & {
  content: string;
};

export type BookRecord = BookManifestItem & {
  levelLabel: string;
  assetCoverImg: string | null;
  firstChapterNumber: number | null;
};

type BookChapterContent = {
  content: string;
  plainText: string;
  chapterTitle: string;
};

const booksManifestCache = {
  value: null as Promise<BookManifestItem[]> | null,
};

const chaptersManifestCache = new Map<string, Promise<BookChaptersManifestResource | null>>();

const DEFAULT_BOOKS_BASE_URL = 'http://localhost:3000/books';

function getWebsiteRootDir() {
  const workspaceWebsiteDir = path.resolve(process.cwd(), 'packages/website');

  if (fsSync.existsSync(workspaceWebsiteDir)) {
    return workspaceWebsiteDir;
  }

  return process.cwd();
}
function getBooksBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BOOKS_URL ||
    process.env.BOOKS_URL ||
    DEFAULT_BOOKS_BASE_URL
  ).replace(/\/$/, '');
}

function getBooksJsonBaseUrl() {
  const configuredBaseUrl = (
    process.env.NEXT_PUBLIC_BOOKS_URL ||
    process.env.BOOKS_URL ||
    DEFAULT_BOOKS_BASE_URL
  ).replace(/\/$/, '');

  if (/\/books-json$/i.test(configuredBaseUrl)) {
    return configuredBaseUrl;
  }

  const booksBaseUrl = getBooksBaseUrl();

  if (/\/books$/i.test(booksBaseUrl)) {
    return booksBaseUrl.replace(/\/books$/i, '/books-json');
  }

  return `${booksBaseUrl}/books-json`;
}

function getBooksJsonDir() {
  const configuredDir = process.env.BOOKS_JSON_DIR?.trim();

  if (!configuredDir) {
    return null;
  }

  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(getWebsiteRootDir(), configuredDir);
}

function getLocalBooksJsonFile(relativePath: string) {
  const booksJsonDir = getBooksJsonDir();
  if (booksJsonDir) {
    return path.join(booksJsonDir, relativePath);
  }

  const booksJsonBaseUrl = getBooksJsonBaseUrl();
  if (!booksJsonBaseUrl.startsWith('/')) {
    return null;
  }

  return path.join(process.cwd(), 'public', booksJsonBaseUrl.replace(/^\/+/, ''), relativePath);
}

function getRemoteBooksJsonUrl(relativePath: string) {
  const booksJsonBaseUrl = getBooksJsonBaseUrl();
  if (booksJsonBaseUrl.startsWith('/')) {
    return `${booksJsonBaseUrl.replace(/\/$/, '')}/${relativePath}`;
  }

  return new URL(relativePath, `${booksJsonBaseUrl.replace(/\/$/, '')}/`).toString();
}

function toBookAssetUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedValue = value.startsWith('/') ? value : `/${value}`;
  if (normalizedValue.startsWith('/covers/')) {
    return normalizedValue;
  }

  const booksBaseUrl = getBooksBaseUrl();

  return `${booksBaseUrl}${normalizedValue}`;
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildParagraphsFromContent(content: string): Record<number, Paragraph> {
  const paragraphs: Record<number, Paragraph> = {};

  content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .forEach((paragraph, index) => {
      paragraphs[index] = {
        type: 'text',
        content: paragraph,
      };
    });

  if (Object.keys(paragraphs).length === 0) {
    paragraphs[0] = {
      type: 'text',
      content: '',
    };
  }

  return paragraphs;
}

function getBookDescription(book: BookRecord, excerpt?: string) {
  if (excerpt) {
    return excerpt.slice(0, 180).trim();
  }

  return `${book.title} by ${book.author || 'Unknown author'} in the ${book.levelLabel} collection. Read ${book.chapterCount} chapters with translation, dictionary, and text-to-speech support.`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function readBooksJson<T>(relativePath: string): Promise<T> {
  const localFile = getLocalBooksJsonFile(relativePath);
  if (localFile) {
    return readJsonFile<T>(localFile);
  }

  const response = await fetch(getRemoteBooksJsonUrl(relativePath), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load books resource: ${relativePath}`);
  }

  return (await response.json()) as T;
}

async function getBooksManifest(): Promise<BookManifestItem[]> {
  if (!booksManifestCache.value) {
    booksManifestCache.value = (async () => {
      try {
        return await readBooksJson<BookManifestItem[]>('books.json');
      } catch (error) {
        console.error('Failed to load books manifest:', error);
        return [];
      }
    })();
  }

  return booksManifestCache.value;
}

async function getBookChaptersManifest(slug: string): Promise<BookChaptersManifestResource | null> {
  if (chaptersManifestCache.has(slug)) {
    return chaptersManifestCache.get(slug) ?? null;
  }

  const loader = (async () => {
    try {
      return await readBooksJson<BookChaptersManifestResource>(`chapters/${slug}/manifest.json`);
    } catch {
      return null;
    }
  })();

  chaptersManifestCache.set(slug, loader);
  return loader;
}

function normalizeBookChapterManifestItem(
  book: BookManifestItem,
  chapter: BookChapterManifestResourceItem,
): BookChapterManifestItem {
  return {
    id: chapter.id,
    bookId: chapter.bookId,
    level: book.level,
    slug: book.slug,
    title: book.title,
    author: book.author,
    chapterTitle: chapter.chapterTitle,
    chapterFile: chapter.chapterFile,
    chapterIndex: chapter.chapterIndex,
    chapterNumber: chapter.chapterNumber,
    sourceChapterMarker: chapter.sourceChapterMarker,
    sourceChapterTitle: chapter.sourceChapterTitle,
    bookDir: book.bookDir ?? `/${book.slug}`,
    coverImg: book.coverImg,
    wordCount: chapter.wordCount ?? 0,
    readingTime: chapter.readingTime ?? 0,
  };
}

async function getChapterResource(chapterMeta: Pick<BookChapterManifestItem, 'id' | 'chapterFile'>): Promise<BookChapterResource | null> {
  try {
    if (chapterMeta.chapterFile) {
      return await readBooksJson<BookChapterResource>(chapterMeta.chapterFile);
    }

    return await readBooksJson<BookChapterResource>(`chapters/${chapterMeta.id}.json`);
  } catch {
    try {
      return await readBooksJson<BookChapterResource>(`chapters/${chapterMeta.id}.json`);
    } catch {
      return null;
    }
  }
}

function toBookRecord(
  book: BookManifestItem,
  levelLabel: string,
  firstChapterNumber: number | null,
  chapterCountOverride?: number,
): BookRecord {
  return {
    ...book,
    chapterCount: chapterCountOverride ?? book.chapterCount,
    levelLabel,
    assetCoverImg: toBookAssetUrl(book.coverImg),
    firstChapterNumber,
  };
}

export function getBookLevel(levelId: string) {
  return BOOK_LEVELS.find((level) => level.id === levelId);
}

export async function getBooksForLevel(levelId: string) {
  const level = getBookLevel(levelId);

  if (!level) {
    return null;
  }

  const books = await getBooksManifest();
  const levelBooks = books.filter((book) => book.level === level.id);
  const firstChapterNumbers = new Map<string, number | null>();
  const chapterCounts = new Map<string, number>();

  await Promise.all(
    levelBooks.map(async (book) => {
      const manifest = await getBookChaptersManifest(book.slug);
      const manifestChapterCount = Array.isArray(manifest?.chapters)
        ? manifest.chapters.length
        : manifest?.chapterCount;
      const firstChapterNumber = manifest?.chapters
        ?.slice()
        .sort((a, b) => a.chapterIndex - b.chapterIndex)
        ?.at(0)?.chapterNumber;

      chapterCounts.set(book.slug, manifestChapterCount ?? book.chapterCount);
      firstChapterNumbers.set(book.slug, firstChapterNumber ?? ((manifestChapterCount ?? book.chapterCount) > 0 ? 1 : null));
    }),
  );

  return {
    ...level,
    total: levelBooks.length,
    books: levelBooks.map((book) =>
      toBookRecord(
        book,
        level.shortLabel,
        firstChapterNumbers.get(book.slug) ?? null,
        chapterCounts.get(book.slug),
      ),
    ),
  };
}

export async function getAllBookLevels() {
  const levels = await Promise.all(BOOK_LEVELS.map((level) => getBooksForLevel(level.id)));
  return levels.filter(Boolean);
}

export async function getAllBooks() {
  const levels = await getAllBookLevels();
  return levels.flatMap((level) => level.books);
}

export async function getBook(levelId: string, slug: string) {
  const level = await getBooksForLevel(levelId);

  if (!level) {
    return null;
  }

  const book = level.books.find((entry) => entry.slug === slug);

  if (!book) {
    return null;
  }

  return {
    level,
    book,
  };
}

export async function getBookChapters(levelId: string, slug: string): Promise<BookChapterManifestItem[]> {
  const books = await getBooksManifest();
  const book = books.find((item) => item.level === levelId && item.slug === slug);
  if (!book) {
    return [];
  }

  const manifest = await getBookChaptersManifest(slug);
  if (!manifest || !Array.isArray(manifest.chapters)) {
    return [];
  }

  return manifest.chapters
    .map((chapter) => normalizeBookChapterManifestItem(book, chapter))
    .sort((a, b) => a.chapterIndex - b.chapterIndex);
}

export async function getChapterContent(
  book: BookRecord,
  chapterIndex = 0,
): Promise<BookChapterContent | null> {
  const chapters = await getBookChapters(book.level, book.slug);
  const chapterMeta = chapters[chapterIndex];

  if (!chapterMeta) {
    return null;
  }

  const chapter = await getChapterResource(chapterMeta);
  if (!chapter) {
    return null;
  }

  return {
    content: chapter.content,
    plainText: chapter.content,
    chapterTitle: chapter.chapterTitle,
  };
}

export async function getBookPageData(levelId: string, slug: string) {
  const result = await getBook(levelId, slug);

  if (!result) {
    return null;
  }

  const chapters = await getBookChapters(levelId, slug);
  const resolvedChapterCount = chapters.length || result.book.chapterCount;
  const firstChapter = await getChapterContent(result.book, 0);
  const book = {
    ...result.book,
    chapterCount: resolvedChapterCount,
  };
  const description = getBookDescription(book, firstChapter?.plainText);

  return {
    ...result,
    book,
    chapters,
    firstChapter,
    description,
  };
}

export async function getBookChapterPageData(levelId: string, slug: string, chapterNumber: number) {
  const result = await getBook(levelId, slug);
  if (!result) {
    return null;
  }

  const chapters = await getBookChapters(levelId, slug);
  const resolvedChapterCount = chapters.length || result.book.chapterCount;
  const book = {
    ...result.book,
    chapterCount: resolvedChapterCount,
  };
  const chapterMeta = chapters.find((chapter) => chapter.chapterNumber === chapterNumber);
  if (!chapterMeta) {
    return null;
  }

  const chapter = await getChapterResource(chapterMeta);
  if (!chapter) {
    return null;
  }

  return {
    ...result,
    book,
    chapters,
    chapterMeta,
    chapter,
    description: getBookDescription(book, chapter.content),
  };
}

export { getBookChapterReaderUrl };

export function buildBookArticle({
  book,
  levelLabel,
  chapter,
}: {
  book: BookRecord;
  levelLabel: string;
  chapter: Pick<
    BookChapterResource,
    'id' | 'content' | 'chapterIndex' | 'chapterTitle' | 'readingTime' | 'wordCount'
  >;
}): Article {
  const paragraphs = buildParagraphsFromContent(chapter.content);
  const plainText = Object.values(paragraphs)
    .filter((paragraph) => paragraph.type === 'text')
    .map((paragraph) => paragraph.content)
    .join(' ');
  const wordCount = chapter.wordCount || countWords(plainText);

  return {
    title: `${book.title} · Chapter ${chapter.chapterIndex + 1}/${book.chapterCount}`,
    site_name: `${book.author || 'Unknown author'} · ${levelLabel}`,
    url: `book://${book.id}/${chapter.id}`,
    word_count: wordCount,
    paragraphs,
    unfamiliar_words: [],
    reading_time: chapter.readingTime || Math.max(1, Math.ceil(wordCount / 150)),
    created_at: new Date().toISOString(),
  };
}
