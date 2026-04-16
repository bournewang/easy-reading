import 'server-only';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import type { Article, Paragraph } from '@easy-reading/shared';
import { getIELTSReaderUrl, getIELTSPassageReaderUrl, ieltsMonthOrder } from '@/lib/ielts-paths';
import type {
  IELTSArticleListItem,
  IELTSArticleManifestItem,
  IELTSArticleResource,
  IELTSReaderTestSummary,
} from '@/lib/ielts-types';

const DEFAULT_IELTS_ARTICLE_BASE_URL = '/ielts-articles';

function getWebsiteRootDir() {
  const workspaceWebsiteDir = path.resolve(process.cwd(), 'packages/website');

  if (fsSync.existsSync(workspaceWebsiteDir)) {
    return workspaceWebsiteDir;
  }

  return process.cwd();
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

function getIELTSArticleBaseUrl() {
  return (
    process.env.IELTS_ARTICLE_BASE_URL ||
    process.env.NEXT_PUBLIC_IELTS_ARTICLE_BASE_URL ||
    DEFAULT_IELTS_ARTICLE_BASE_URL
  );
}

function getIELTSArticleDir() {
  const configuredDir = process.env.IELTS_ARTICLE_DIR?.trim();

  if (!configuredDir) {
    return null;
  }

  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(getWebsiteRootDir(), configuredDir);
}

function getLocalResourceFile(relativePath: string) {
  const localResourceDir = getIELTSArticleDir();
  if (localResourceDir) {
    return path.join(localResourceDir, relativePath);
  }

  const baseUrl = getIELTSArticleBaseUrl();
  if (!baseUrl.startsWith('/')) {
    return null;
  }

  return path.join(process.cwd(), 'public', baseUrl.replace(/^\/+/, ''), relativePath);
}

function getRemoteResourceUrl(relativePath: string) {
  const baseUrl = getIELTSArticleBaseUrl();
  if (baseUrl.startsWith('/')) {
    return `${baseUrl.replace(/\/$/, '')}/${relativePath}`;
  }

  return new URL(relativePath, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

async function readResourceJson<T>(relativePath: string): Promise<T> {
  const localFile = getLocalResourceFile(relativePath);
  if (localFile) {
    const raw = await fs.readFile(localFile, 'utf8');
    return JSON.parse(raw) as T;
  }

  const response = await fetch(getRemoteResourceUrl(relativePath), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load IELTS resource: ${relativePath}`);
  }

  return (await response.json()) as T;
}

const getIELTSManifest = cache(async () => {
  let articles: IELTSArticleManifestItem[] = [];

  try {
    articles = await readResourceJson<IELTSArticleManifestItem[]>('index.json');
  } catch {
    articles = [];
  }

  return articles
    .map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source || 'IELTS Reading',
      year: article.year,
      month: article.month,
      test: article.test,
      passage: article.passage,
      order: Number(article.test) * 10 + Number(article.passage),
      readingTime: article.readingTime || Math.max(1, Math.ceil(article.wordCount / 150)),
      wordCount: article.wordCount || 0,
      url: getIELTSReaderUrl(article.id),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) {
        return Number(b.year) - Number(a.year);
      }

      const monthDiff =
        ieltsMonthOrder.indexOf(b.month as (typeof ieltsMonthOrder)[number]) -
        ieltsMonthOrder.indexOf(a.month as (typeof ieltsMonthOrder)[number]);
      if (monthDiff !== 0) {
        return monthDiff;
      }

      return a.order - b.order;
    });
});

export async function getIELTSArticleList(): Promise<IELTSArticleListItem[]> {
  return getIELTSManifest();
}

export async function getIELTSArticleById(articleId: string): Promise<Article | null> {
  try {
    const rawArticle = await readResourceJson<IELTSArticleResource>(`articles/${articleId}.json`);

    const paragraphs = buildParagraphsFromContent(rawArticle.content || '');
    const textContent = Object.values(paragraphs)
      .filter((paragraph) => paragraph.type === 'text')
      .map((paragraph) => paragraph.content)
      .join(' ');
    const wordCount = rawArticle.wordCount || countWords(textContent);

    return {
      title: rawArticle.title,
      site_name: rawArticle.source || 'IELTS Reading',
      url: `ielts://${articleId}`,
      word_count: wordCount,
      paragraphs,
      unfamiliar_words: [],
      reading_time: rawArticle.readingTime || Math.max(1, Math.ceil(wordCount / 150)),
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getIELTSArticlesForTest(
  year: string,
  month: string,
  test: string,
): Promise<IELTSArticleListItem[]> {
  const articles = await getIELTSArticleList();
  return articles.filter(
    (article) => article.year === year && article.month === month && article.test === test,
  );
}

export async function getIELTSTestSummary(
  year: string,
  month: string,
  test: string,
): Promise<IELTSReaderTestSummary | null> {
  const articles = await getIELTSArticlesForTest(year, month, test);
  if (!articles.length) {
    return null;
  }

  return {
    year,
    month,
    test,
    source: articles[0].source,
    articleCount: articles.length,
    url: getIELTSPassageReaderUrl(year, month, test, articles[0].passage),
  };
}
