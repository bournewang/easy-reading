import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import type { Article, Paragraph } from '@easy-reading/shared';
import { getBookChapterReaderUrl } from '@/lib/reading-routes';

export type BookLevel = {
  id: string;
  label: string;
  shortLabel: string;
  file: string;
  description: string;
};

export type BookManifestItem = {
  id: string;
  level: string;
  slug: string;
  title: string;
  author: string;
  coverImg: string | null;
  original: string;
  bookDir: string;
  chapterCount: number;
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
  bookDir: string;
  coverImg: string | null;
  wordCount: number;
  readingTime: number;
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

const DEFAULT_BOOKS_BASE_URL = 'http://localhost:3000/books';

function getWebsiteRootDir() {
  const workspaceWebsiteDir = path.resolve(process.cwd(), 'packages/website');

  if (fsSync.existsSync(workspaceWebsiteDir)) {
    return workspaceWebsiteDir;
  }

  return process.cwd();
}

export const BOOK_LEVELS: BookLevel[] = [
  {
    id: 'a1',
    label: 'A1 English Books',
    shortLabel: 'A1',
    file: 'index-a1.json',
    description: 'Best for complete beginners who know basic everyday words and want very short, simple stories to build reading confidence.',
  },
  {
    id: 'a2',
    label: 'A2 English Books',
    shortLabel: 'A2',
    file: 'index-a2.json',
    description: 'Best for early learners who can handle familiar sentences and want easy stories that grow everyday vocabulary and fluency.',
  },
  {
    id: 'b11',
    label: 'B1.1 English Books',
    shortLabel: 'B1.1',
    file: 'index-b11.json',
    description: 'Best for lower-intermediate readers who are moving beyond easy texts and want longer stories with manageable new vocabulary.',
  },
  {
    id: 'b12',
    label: 'B1.2 English Books',
    shortLabel: 'B1.2',
    file: 'index-b12.json',
    description: 'Best for solid intermediate learners who want richer plots, more natural sentence patterns, and broader day-to-day vocabulary.',
  },
  {
    id: 'b21',
    label: 'B2.1 English Books',
    shortLabel: 'B2.1',
    file: 'index-b21.json',
    description: 'Best for upper-intermediate readers who can read independently and want deeper narratives with more descriptive and abstract language.',
  },
  {
    id: 'b22',
    label: 'B2.2 English Books',
    shortLabel: 'B2.2',
    file: 'index-b22.json',
    description: 'Best for strong upper-intermediate learners who want near-authentic reading practice and smoother comprehension across longer chapters.',
  },
  {
    id: 'c1',
    label: 'C1 English Books',
    shortLabel: 'C1',
    file: 'index-c1.json',
    description: 'Best for advanced readers who want challenging, authentic-style books with nuanced vocabulary, complex structure, and mature themes.',
  },
];

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
  try {
    return await readBooksJson<BookManifestItem[]>('books.json');
  } catch (error) {
    console.error('Failed to load books manifest:', error);
    return [];
  }
}

async function getChaptersManifest(): Promise<BookChapterManifestItem[]> {
  try {
    return await readBooksJson<BookChapterManifestItem[]>('chapters.json');
  } catch (error) {
    console.error('Failed to load chapters manifest:', error);
    return [];
  }
}

async function getChapterResource(chapterId: string): Promise<BookChapterResource | null> {
  try {
    return await readBooksJson<BookChapterResource>(`chapters/${chapterId}.json`);
  } catch {
    return null;
  }
}

function toBookRecord(
  book: BookManifestItem,
  levelLabel: string,
  firstChapterNumber: number | null,
): BookRecord {
  return {
    ...book,
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
  const chapters = await getChaptersManifest();
  const levelBooks = books.filter((book) => book.level === level.id);
  const firstChapterNumbers = new Map<string, number>();

  chapters
    .filter((chapter) => chapter.level === level.id)
    .sort((a, b) => a.chapterIndex - b.chapterIndex)
    .forEach((chapter) => {
      if (!firstChapterNumbers.has(chapter.slug)) {
        firstChapterNumbers.set(chapter.slug, chapter.chapterNumber);
      }
    });

  return {
    ...level,
    total: levelBooks.length,
    books: levelBooks.map((book) =>
      toBookRecord(book, level.shortLabel, firstChapterNumbers.get(book.slug) ?? null),
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
  const chapters = await getChaptersManifest();
  return chapters
    .filter((chapter) => chapter.level === levelId && chapter.slug === slug)
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

  const chapter = await getChapterResource(chapterMeta.id);
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
  const firstChapter = await getChapterContent(result.book, 0);
  const description = getBookDescription(result.book, firstChapter?.plainText);

  return {
    ...result,
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
  const chapterMeta = chapters.find((chapter) => chapter.chapterNumber === chapterNumber);
  if (!chapterMeta) {
    return null;
  }

  const chapter = await getChapterResource(chapterMeta.id);
  if (!chapter) {
    return null;
  }

  return {
    ...result,
    chapters,
    chapterMeta,
    chapter,
    description: getBookDescription(result.book, chapter.content),
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
