import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://english-reader.com').replace(/\/+$/, '');
const WEBSITE_DIR = path.resolve(process.cwd());
const BOOKS_PATH = path.join(WEBSITE_DIR, 'public', 'books.json');
const OUTPUT_PATH = path.join(WEBSITE_DIR, 'public', 'sitemap.xml');

const staticRoutes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/news', changefreq: 'daily', priority: '0.9' },
  { path: '/books', changefreq: 'weekly', priority: '0.8' },
  { path: '/books/a1', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/a2', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/b11', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/b12', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/b21', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/b22', changefreq: 'weekly', priority: '0.7' },
  { path: '/books/c1', changefreq: 'weekly', priority: '0.7' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.6' },
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(routePath) {
  return routePath === '/' ? SITE_URL : `${SITE_URL}${routePath}`;
}

async function loadBookRoutes() {
  const raw = await fs.readFile(BOOKS_PATH, 'utf8');
  const books = JSON.parse(raw);

  return books.map((book) => ({
    path: `/books-reader/${encodeURIComponent(book.level)}/${encodeURIComponent(book.slug)}/${encodeURIComponent(String(1))}`,
    changefreq: 'monthly',
    priority: '0.6',
  }));
}

function buildXml(entries) {
  const lastmod = new Date().toISOString();
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ path: routePath, changefreq, priority }) => [
      '  <url>',
      `    <loc>${xmlEscape(absoluteUrl(routePath))}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const bookRoutes = await loadBookRoutes();
  const entries = [...staticRoutes, ...bookRoutes];
  const xml = buildXml(entries);

  await fs.writeFile(OUTPUT_PATH, xml, 'utf8');

  console.log(`Generated sitemap with ${entries.length} URLs at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

