#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    input: '17314.txt',
    outputDir: 'resource/parsed-books/five-children-and-it',
    level: 'b11',
    slug: 'five-children-and-it',
    title: 'Five Children and It',
    author: 'E. Nesbit',
    bookDir: '/five-children-and-it',
    coverImg: '/covers/five-children-and-it.jpg',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--input') {
      options.input = argv[index + 1] || options.input;
      index += 1;
      continue;
    }

    if (arg === '--output-dir') {
      options.outputDir = argv[index + 1] || options.outputDir;
      index += 1;
      continue;
    }

    if (arg === '--level') {
      options.level = argv[index + 1] || options.level;
      index += 1;
      continue;
    }

    if (arg === '--slug') {
      options.slug = argv[index + 1] || options.slug;
      index += 1;
      continue;
    }

    if (arg === '--title') {
      options.title = argv[index + 1] || options.title;
      index += 1;
      continue;
    }

    if (arg === '--author') {
      options.author = argv[index + 1] || options.author;
      index += 1;
      continue;
    }

    if (arg === '--book-dir') {
      options.bookDir = argv[index + 1] || options.bookDir;
      index += 1;
      continue;
    }

    if (arg === '--cover-img') {
      options.coverImg = argv[index + 1] || options.coverImg;
      index += 1;
    }
  }

  return options;
}

function showHelp() {
  console.log(`Parse a plain-text book into chapter JSON files.

Usage:
  node ./scripts/parse-book-text-by-chapter.mjs [--input 17314.txt] [--output-dir resource/parsed-books/five-children-and-it]

Behavior:
  - reads a Project Gutenberg style plain-text book
  - finds chapter boundaries from lines like _THE FIRST CHAPTER_ or CHAPTER IV
  - uses the next non-empty line as the chapter title
  - writes chapter JSON files in the existing books chapter resource format
  - writes chapters.json as a manifest without the content field
`);
}

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeParagraphs(lines) {
  const paragraphs = [];
  let currentParagraph = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' ').replace(/\s+/g, ' ').trim());
        currentParagraph = [];
      }
      continue;
    }

    if (/^\[Illustration:/i.test(trimmed)) {
      continue;
    }

    currentParagraph.push(trimmed);
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' ').replace(/\s+/g, ' ').trim());
  }

  return paragraphs.filter(Boolean);
}

function extractBookTitle(text, inputPath) {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  return path.basename(inputPath, path.extname(inputPath));
}

function trimToBookContent(text) {
  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);

  const trimmedStart = startIndex >= 0 ? text.slice(startIndex + startMarker.length) : text;
  return endIndex >= 0 ? trimmedStart.slice(0, trimmedStart.indexOf(endMarker)) : trimmedStart;
}

function parseChapters(text, inputPath) {
  const bodyText = trimToBookContent(text).replace(/\r\n/g, '\n');
  const lines = bodyText.split('\n');
  const chapterMarkerPatterns = [
    /^_THE\s+(.+?)\s+CHAPTER_$/,
    /^CHAPTER\s+[IVXLCDM]+$/,
  ];
  const chapterStarts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (chapterMarkerPatterns.some((pattern) => pattern.test(line))) {
      chapterStarts.push(index);
    }
  }

  if (chapterStarts.length === 0) {
    throw new Error(`No chapter markers found in ${inputPath}`);
  }

  return chapterStarts.map((chapterStart, chapterIndex) => {
    const nextChapterStart = chapterStarts[chapterIndex + 1] ?? lines.length;
    let titleLineIndex = chapterStart + 1;

    while (titleLineIndex < nextChapterStart && !lines[titleLineIndex].trim()) {
      titleLineIndex += 1;
    }

    if (titleLineIndex >= nextChapterStart) {
      throw new Error(`Missing chapter title after marker at line ${chapterStart + 1}`);
    }

    const chapterLabel = lines[chapterStart].trim().replace(/^_+|_+$/g, '');
    const sourceChapterTitle = lines[titleLineIndex].trim();
    const contentLines = lines.slice(titleLineIndex + 1, nextChapterStart);
    const paragraphs = normalizeParagraphs(contentLines);
    const content = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
    const chapterNumber = chapterIndex + 1;
    const wordCount = countWords(content);

    return {
      chapterNumber,
      chapterLabel,
      sourceChapterTitle,
      sourceFile: path.basename(inputPath),
      wordCount,
      readingTime: Math.max(1, Math.ceil(wordCount / 150)),
      content,
    };
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  const workspaceDir = process.cwd();
  const inputPath = path.resolve(workspaceDir, options.input);
  const outputDir = path.resolve(workspaceDir, options.outputDir);
  const chaptersDir = path.join(outputDir, 'chapters');
  const rawText = await fs.readFile(inputPath, 'utf8');
  const bookId = `${options.level}__${options.slug}`;
  const chapters = parseChapters(rawText, inputPath).map((chapter) => {
    const chapterId = `${bookId}__chapter-${chapter.chapterNumber}`;

    return {
      id: chapterId,
      bookId,
      level: options.level,
      slug: options.slug,
      title: options.title || extractBookTitle(rawText, inputPath),
      author: options.author,
      chapterTitle: `Chapter ${chapter.chapterNumber}`,
      chapterFile: `chapter-${chapter.chapterNumber}.html`,
      chapterIndex: chapter.chapterNumber - 1,
      chapterNumber: chapter.chapterNumber,
      bookDir: options.bookDir,
      coverImg: options.coverImg,
      content: chapter.content,
      wordCount: chapter.wordCount,
      readingTime: chapter.readingTime,
    };
  });
  const chapterMetadata = chapters.map(({ content: _content, ...chapter }) => chapter);

  await fs.mkdir(chaptersDir, { recursive: true });

  await Promise.all(
    chapters.map((chapter) =>
      fs.writeFile(
        path.join(chaptersDir, `${chapter.id}.json`),
        `${JSON.stringify(chapter, null, 2)}\n`,
        'utf8',
      ),
    ),
  );

  const manifest = {
    id: bookId,
    level: options.level,
    slug: options.slug,
    title: options.title || extractBookTitle(rawText, inputPath),
    author: options.author,
    coverImg: options.coverImg,
    bookDir: options.bookDir,
    sourceFile: path.relative(workspaceDir, inputPath),
    chapterCount: chapters.length,
    generatedAt: new Date().toISOString(),
    chapters: chapterMetadata,
  };

  await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, 'chapters.json'), `${JSON.stringify(chapterMetadata, null, 2)}\n`, 'utf8');

  console.log(`Parsed ${chapters.length} chapters from ${path.relative(workspaceDir, inputPath)} into ${path.relative(workspaceDir, outputDir)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});