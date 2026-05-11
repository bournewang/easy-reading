#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const HIGHLIGHT_START = '\u001b[33m';
const HIGHLIGHT_END = '\u001b[0m';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function showHelp() {
  console.log(`Prune orphaned book chapters from resource/books-json/chapters.json.

Usage:
  node ./scripts/prune-book-chapters.mjs [--dry-run]

Behavior:
  - reads resource/books-json/books.json
  - reads resource/books-json/chapters.json
  - removes chapter entries whose bookId is not present in books.json
  - removes chapter entries whose generated chapter content is empty
  - deletes matching resource/books-json/chapters/<chapter-id>.json files on real runs
  - rewrites books.json chapterCount values after pruning
  - rewrites chapters.json in place unless --dry-run is provided
`);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function isChapterEmpty(chapterResource) {
  if (!chapterResource || typeof chapterResource !== 'object') {
    return false;
  }

  if (typeof chapterResource.content === 'string') {
    return chapterResource.content.trim().length === 0;
  }

  return Number(chapterResource.wordCount || 0) <= 0;
}

function formatHighlighted(label) {
  return `${HIGHLIGHT_START}${label}${HIGHLIGHT_END}`;
}

async function getRemovalReason(chapter, chapterFilePath, validBookIds) {
  if (!validBookIds.has(String(chapter?.bookId || '').trim())) {
    return 'orphaned';
  }

  try {
    const chapterResource = await readJson(chapterFilePath);
    if (isChapterEmpty(chapterResource)) {
      return 'empty';
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return 'missing-file';
    }

    throw error;
  }

  return null;
}

function getSourceChapterFilePath(resourceDir, chapter) {
  const slug = String(chapter?.slug || '').trim();
  const chapterFile = String(chapter?.chapterFile || '').trim();

  if (!slug || !chapterFile) {
    return null;
  }

  return path.join(resourceDir, 'public', 'book-files', slug, chapterFile);
}

function updateBookChapterCounts(books, keptChapters) {
  const chapterCounts = keptChapters.reduce((map, chapter) => {
    const bookId = String(chapter?.bookId || '').trim();
    if (!bookId) {
      return map;
    }

    map.set(bookId, (map.get(bookId) || 0) + 1);
    return map;
  }, new Map());

  return books.map((book) => ({
    ...book,
    chapterCount: chapterCounts.get(String(book?.id || '').trim()) || 0,
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  const resourceDir = path.resolve(process.cwd(), 'resource/books-json');
  const booksPath = path.join(resourceDir, 'books.json');
  const chaptersPath = path.join(resourceDir, 'chapters.json');
  const chapterResourcesDir = path.join(resourceDir, 'chapters');

  const books = await readJson(booksPath);
  const chapters = await readJson(chaptersPath);

  if (!Array.isArray(books)) {
    throw new Error(`Expected an array in ${booksPath}`);
  }

  if (!Array.isArray(chapters)) {
    throw new Error(`Expected an array in ${chaptersPath}`);
  }

  const validBookIds = new Set(
    books
      .map((book) => String(book?.id || '').trim())
      .filter(Boolean),
  );

  const chapterEvaluations = await Promise.all(
    chapters.map(async (chapter) => {
      const chapterId = String(chapter?.id || '').trim();
      const chapterFilePath = path.join(chapterResourcesDir, `${chapterId}.json`);
      const reason = await getRemovalReason(chapter, chapterFilePath, validBookIds);

      return {
        chapter,
        chapterFilePath,
        reason,
      };
    }),
  );

  const removedEntries = chapterEvaluations.filter((entry) => entry.reason);
  const keptChapters = chapterEvaluations
    .filter((entry) => !entry.reason)
    .map((entry) => entry.chapter);
  const updatedBooks = updateBookChapterCounts(books, keptChapters);
  const removedCount = removedEntries.length;
  const emptyEntries = removedEntries.filter((entry) => entry.reason === 'empty');
  const orphanedCount = removedEntries.filter((entry) => entry.reason === 'orphaned').length;
  const missingFileCount = removedEntries.filter((entry) => entry.reason === 'missing-file').length;

  if (options.dryRun) {
    console.log(`Dry run: would remove ${removedCount} chapter entries from ${path.relative(process.cwd(), chaptersPath)}.`);
    console.log(`  orphaned: ${orphanedCount}`);
    console.log(`  empty: ${emptyEntries.length}`);
    console.log(`  missing-file: ${missingFileCount}`);

    if (emptyEntries.length > 0) {
      console.log('');
      console.log(formatHighlighted('Empty chapters'));
      emptyEntries.forEach(({ chapter, chapterFilePath }) => {
        const sourceChapterFilePath = getSourceChapterFilePath(process.cwd(), chapter);
        console.log(
          `  ${chapter.id} | ${chapter.title || 'Untitled book'} | ${chapter.chapterTitle || chapter.chapterFile || 'Untitled chapter'}`,
        );
        console.log(`    generated: ${path.relative(process.cwd(), chapterFilePath)}`);
        if (sourceChapterFilePath) {
          console.log(`    source: ${path.relative(process.cwd(), sourceChapterFilePath)}`);
        }
      });
    }

    return;
  }

  await Promise.all(
    removedEntries.map(({ chapterFilePath, reason }) =>
      reason === 'empty' || reason === 'missing-file' || reason === 'orphaned'
        ? fs.rm(chapterFilePath, { force: true })
        : Promise.resolve(),
    ),
  );

  await fs.writeFile(chaptersPath, `${JSON.stringify(keptChapters, null, 2)}\n`, 'utf8');
  await fs.writeFile(booksPath, `${JSON.stringify(updatedBooks, null, 2)}\n`, 'utf8');

  console.log(`Removed ${removedCount} chapter entries from ${path.relative(process.cwd(), chaptersPath)}.`);
  console.log(`  orphaned: ${orphanedCount}`);
  console.log(`  empty: ${emptyEntries.length}`);
  console.log(`  missing-file: ${missingFileCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});