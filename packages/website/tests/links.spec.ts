/**
 * Link reachability tests.
 *
 * These tests verify that all major routes return a rendered page (no 404 / 500)
 * after feature changes or data updates.  They run against a live Next.js dev or
 * production server.  Set TEST_BASE_URL to point at the right host.
 *
 * Run:  pnpm test:e2e
 */

import path from 'path';
import fs from 'fs';
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a JSON file relative to the website root. */
function loadJson<T>(relativePath: string): T {
  const abs = path.resolve(__dirname, '..', relativePath);
  return JSON.parse(fs.readFileSync(abs, 'utf8')) as T;
}

/** Assert a page loaded without a 404 / 500 banner. */
async function expectPageOk(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `HTTP status for ${url}`).toBeLessThan(400);

  // Next.js renders "404" or "500" headings on error pages — make sure they
  // are NOT present.
  const body = await page.locator('body').innerText();
  expect(body, `Page should not contain "404" text on ${url}`).not.toContain('This page could not be found');
  expect(body, `Page should not contain "500" text on ${url}`).not.toContain('Internal Server Error');
}

// ---------------------------------------------------------------------------
// Data helpers — read the same manifests the app uses so tests stay in sync
// ---------------------------------------------------------------------------

type BookManifestItem = {
  id: string;
  level: string;
  slug: string;
  title: string;
  chapterCount: number;
};

type IELTSManifestItem = {
  id: string;
  year: string;
  month: string;
  test: string;
  passage: string;
};

function getBooksManifest(): BookManifestItem[] {
  try {
    return loadJson<BookManifestItem[]>('resource/books-json/books.json');
  } catch {
    return [];
  }
}

function getIELTSManifest(): IELTSManifestItem[] {
  try {
    return loadJson<IELTSManifestItem[]>('resource/ielts-articles/index.json');
  } catch {
    return [];
  }
}

/** Pick one representative book per level. */
function sampleBooksByLevel(books: BookManifestItem[]): BookManifestItem[] {
  const seen = new Set<string>();
  const result: BookManifestItem[] = [];
  for (const book of books) {
    if (!seen.has(book.level) && book.chapterCount > 0) {
      seen.add(book.level);
      result.push(book);
    }
  }
  return result;
}

/** Pick one representative IELTS passage per (year, month) combination. */
function sampleIELTSByYearMonth(items: IELTSManifestItem[]): IELTSManifestItem[] {
  const seen = new Set<string>();
  const result: IELTSManifestItem[] = [];
  for (const item of items) {
    const key = `${item.year}-${item.month}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Static / navigation routes
// ---------------------------------------------------------------------------

const staticRoutes: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Books listing', path: '/books' },
  { label: 'IELTS listing', path: '/ielts' },
  { label: 'News listing', path: '/news' },
  { label: 'Login', path: '/login' },
  { label: 'Register', path: '/register' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Word list', path: '/wordlist' },
  { label: 'History', path: '/history' },
];

for (const route of staticRoutes) {
  test(`Static route – ${route.label} (${route.path})`, async ({ page }) => {
    await expectPageOk(page, route.path);
  });
}

// ---------------------------------------------------------------------------
// Books level pages  /books/[level]
// ---------------------------------------------------------------------------

test('Books level pages exist for every known level', async ({ page }) => {
  const levels = ['a1', 'a2', 'b11', 'b12', 'b21', 'b22', 'c1'];
  for (const level of levels) {
    await expectPageOk(page, `/books/${level}`);
  }
});

// ---------------------------------------------------------------------------
// Books reader  /books-reader/[level]/[slug]/[chapter]
// ---------------------------------------------------------------------------

test('Books reader – one book per level opens chapter 1', async ({ page }) => {
  const books = getBooksManifest();
  if (books.length === 0) {
    test.skip(true, 'No books manifest found – skipping books reader test');
    return;
  }

  const samples = sampleBooksByLevel(books);
  for (const book of samples) {
    const url = `/books-reader/${encodeURIComponent(book.level)}/${encodeURIComponent(book.slug)}/1`;
    await expectPageOk(page, url);
  }
});

test('Books reader – first and last chapter of a randomly-sampled book open', async ({ page }) => {
  const books = getBooksManifest().filter((b) => b.chapterCount > 1);
  if (books.length === 0) {
    test.skip(true, 'No multi-chapter books found');
    return;
  }

  // Pick the first multi-chapter book as the stable sample
  const book = books[0];
  const firstUrl = `/books-reader/${encodeURIComponent(book.level)}/${encodeURIComponent(book.slug)}/1`;
  const lastUrl = `/books-reader/${encodeURIComponent(book.level)}/${encodeURIComponent(book.slug)}/${book.chapterCount}`;

  await expectPageOk(page, firstUrl);
  await expectPageOk(page, lastUrl);
});

test('Books reader – invalid chapter returns 404', async ({ page }) => {
  const books = getBooksManifest();
  if (books.length === 0) {
    test.skip(true, 'No books manifest found');
    return;
  }

  const book = books[0];
  const url = `/books-reader/${encodeURIComponent(book.level)}/${encodeURIComponent(book.slug)}/99999`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Either a 404 HTTP status OR Next.js renders a not-found page
  const is404 =
    (response?.status() ?? 0) === 404 ||
    (await page.locator('body').innerText()).includes('404');
  expect(is404, `Expected 404 for out-of-range chapter: ${url}`).toBe(true);
});

// ---------------------------------------------------------------------------
// IELTS reader  /ielts-reader/[year]/[month]/[test]/[passage]
// ---------------------------------------------------------------------------

test('IELTS reader – one passage per year/month opens correctly', async ({ page }) => {
  const items = getIELTSManifest();
  if (items.length === 0) {
    test.skip(true, 'No IELTS manifest found – skipping IELTS reader test');
    return;
  }

  const samples = sampleIELTSByYearMonth(items);
  for (const item of samples) {
    const url = `/ielts-reader/${encodeURIComponent(item.year)}/${encodeURIComponent(item.month)}/${encodeURIComponent(item.test)}/${encodeURIComponent(item.passage)}`;
    await expectPageOk(page, url);
  }
});

test('IELTS reader – invalid passage returns 404', async ({ page }) => {
  const url = '/ielts-reader/9999/january/1/1';
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  const is404 =
    (response?.status() ?? 0) === 404 ||
    (await page.locator('body').innerText()).includes('404');
  expect(is404, `Expected 404 for non-existent IELTS passage: ${url}`).toBe(true);
});

// ---------------------------------------------------------------------------
// News reader  /news-reader/[category]/[slug]
// ---------------------------------------------------------------------------

test('News listing page loads', async ({ page }) => {
  await expectPageOk(page, '/news');
});

test('News reader – first article link from listing is reachable', async ({ page }) => {
  await page.goto('/news', { waitUntil: 'domcontentloaded' });

  // Find the first article link on the news listing page
  const firstLink = page.locator('a[href*="/news-reader/"]').first();
  const count = await firstLink.count();
  if (count === 0) {
    test.skip(true, 'No news article links found on /news – skipping');
    return;
  }

  const href = await firstLink.getAttribute('href');
  if (!href) return;

  await expectPageOk(page, href);
});

// ---------------------------------------------------------------------------
// User / auth routes
// ---------------------------------------------------------------------------

test('User center page redirects or loads (not 500)', async ({ page }) => {
  const response = await page.goto('/user', { waitUntil: 'domcontentloaded' });
  // Unauthenticated access should redirect to /login (3xx) or show the page (200)
  // It must NOT be a server error (5xx)
  expect(response?.status() ?? 0, 'User page should not 500').toBeLessThan(500);
});

test('Subscription page loads or redirects (not 500)', async ({ page }) => {
  const response = await page.goto('/subscription', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 0, 'Subscription page should not 500').toBeLessThan(500);
});
