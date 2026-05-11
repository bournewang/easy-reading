#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    input: '',
    booksDir: 'books',
    levelsFile: 'book-names.txt',
    level: '',
    slug: '',
    title: '',
    author: '',
    bookDir: '',
    coverImg: '',
    all: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--all') {
      options.all = true;
      continue;
    }

    if (arg === '--input') {
      options.input = argv[index + 1] || options.input;
      index += 1;
      continue;
    }

    if (arg === '--books-dir') {
      options.booksDir = argv[index + 1] || options.booksDir;
      index += 1;
      continue;
    }

    if (arg === '--levels-file') {
      options.levelsFile = argv[index + 1] || options.levelsFile;
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
  console.log(`Parse Project Gutenberg style plain-text books into chapter JSON files.

Usage:
  node ./scripts/parse-book-text-by-chapter.mjs --input books/my-book.txt
  node ./scripts/parse-book-text-by-chapter.mjs --all

Behavior:
  - infers title and author from the source file when possible
  - resolves level from book-names.txt when possible
  - writes one folder per book under resource/books-json/chapters/:slug
  - writes manifest.json plus chapter-N.json files for each parsed chapter
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

function extractAuthor(text) {
  const authorMatch = text.match(/^Author:\s*(.+)$/m);
  if (authorMatch?.[1]) {
    return authorMatch[1].trim();
  }

  return '';
}

function normalizeLookupValue(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function slugifyValue(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function parseLevelMap(text) {
  const lines = text.split(/\r?\n/);
  const titleToLevel = new Map();
  const slugToLevel = new Map();
  let currentLevel = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^(a1|a2|b11|b12|b21|b22|c1)$/i.test(line)) {
      currentLevel = line.toLowerCase();
      continue;
    }

    if (!currentLevel) {
      continue;
    }

    titleToLevel.set(normalizeLookupValue(line), currentLevel);
    slugToLevel.set(slugifyValue(line), currentLevel);
  }

  return { titleToLevel, slugToLevel };
}

function resolveBookLevel(levelMap, title, slug) {
  if (title) {
    const byTitle = levelMap.titleToLevel.get(normalizeLookupValue(title));
    if (byTitle) {
      return byTitle;
    }
  }

  if (slug) {
    return levelMap.slugToLevel.get(slug) || '';
  }

  return '';
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function getChapterOutputRelativeDir(workspaceDir, outputDir) {
  const normalizedWorkspaceDir = path.resolve(workspaceDir);
  const normalizedOutputDir = path.resolve(outputDir);
  const booksJsonRoots = [
    path.join(normalizedWorkspaceDir, 'resource', 'books-json'),
    path.join(normalizedWorkspaceDir, 'public', 'books-json'),
  ];

  for (const booksJsonRoot of booksJsonRoots) {
    const relativeToBooksJsonRoot = path.relative(booksJsonRoot, normalizedOutputDir);
    if (relativeToBooksJsonRoot && !relativeToBooksJsonRoot.startsWith('..') && !path.isAbsolute(relativeToBooksJsonRoot)) {
      return toPosixPath(relativeToBooksJsonRoot);
    }
  }
  return toPosixPath(path.relative(normalizedWorkspaceDir, normalizedOutputDir));
}

function getBooksJsonRootDir(workspaceDir, outputDir) {
  const normalizedWorkspaceDir = path.resolve(workspaceDir);
  const normalizedOutputDir = path.resolve(outputDir);
  const booksJsonRoots = [
    path.join(normalizedWorkspaceDir, 'resource', 'books-json'),
    path.join(normalizedWorkspaceDir, 'public', 'books-json'),
  ];

  for (const booksJsonRoot of booksJsonRoots) {
    const relativeToBooksJsonRoot = path.relative(booksJsonRoot, normalizedOutputDir);
    if (!relativeToBooksJsonRoot.startsWith('..') && !path.isAbsolute(relativeToBooksJsonRoot)) {
      return booksJsonRoot;
    }
  }

  return null;
}

async function syncBooksManifestEntry(workspaceDir, outputDir, manifest) {
  const booksJsonRootDir = getBooksJsonRootDir(workspaceDir, outputDir);
  if (!booksJsonRootDir) {
    return;
  }

  const booksJsonPath = path.join(booksJsonRootDir, 'books.json');
  let books = [];

  try {
    books = JSON.parse(await fs.readFile(booksJsonPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const existingIndex = books.findIndex((book) => book?.id === manifest.id || book?.slug === manifest.slug);
  const existingEntry = existingIndex >= 0 ? books[existingIndex] : null;

  const nextEntry = {
    id: manifest.id,
    level: manifest.level,
    slug: manifest.slug,
    title: manifest.title,
    author: manifest.author,
    coverImg: manifest.coverImg,
    bookDir: manifest.bookDir,
    chapterCount: existingEntry?.chapterCount ?? manifest.chapterCount,
    generatedAt: manifest.generatedAt,
    sourceFile: manifest.sourceFile,
  };

  if (existingIndex >= 0) {
    books[existingIndex] = nextEntry;
  } else {
    books.push(nextEntry);
  }

  books.sort((left, right) => {
    const leftLevel = String(left?.level || '');
    const rightLevel = String(right?.level || '');
    if (leftLevel !== rightLevel) {
      return leftLevel.localeCompare(rightLevel);
    }

    const leftSlug = String(left?.slug || '');
    const rightSlug = String(right?.slug || '');
    return leftSlug.localeCompare(rightSlug);
  });

  await fs.writeFile(booksJsonPath, `${JSON.stringify(books, null, 2)}\n`, 'utf8');
}

function buildChapterMetadata(chapter) {
  return {
    id: chapter.id,
    bookId: chapter.bookId,
    chapterTitle: chapter.chapterTitle,
    chapterFile: chapter.chapterFile,
    chapterIndex: chapter.chapterIndex,
    chapterNumber: chapter.chapterNumber,
    sourceChapterMarker: chapter.sourceChapterMarker,
    sourceChapterTitle: chapter.sourceChapterTitle,
    wordCount: chapter.wordCount,
    readingTime: chapter.readingTime,
  };
}

function trimToBookContent(text) {
  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);

  const trimmedStart = startIndex >= 0 ? text.slice(startIndex + startMarker.length) : text;
  return endIndex >= 0 ? trimmedStart.slice(0, trimmedStart.indexOf(endMarker)) : trimmedStart;
}

function normalizeChapterMarker(line) {
  return line
    .trim()
    .replace(/^_+|_+$/g, '')
    .replace(/[.:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CHAPTER_NUMBER_WORDS = new Set([
  'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
  'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
  'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH',
  'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH',
  'TWENTIETH', 'THIRTIETH', 'FORTIETH', 'FIFTIETH', 'SIXTIETH', 'SEVENTIETH', 'EIGHTIETH', 'NINETIETH',
]);

function isWordNumberToken(token) {
  return token
    .split('-')
    .every((part) => CHAPTER_NUMBER_WORDS.has(part));
}

function parseChapterHeadingParts(line) {
  const normalized = normalizeChapterMarker(line);
  const match = normalized.match(/^CHAPTER\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }

  const rest = match[1].trim();
  const numericMatch = rest.match(/^([IVXLCDM]+|\d+)(?:[.:])?(?:\s+(.+))?$/i);
  if (numericMatch?.[1]) {
    const chapterTitle = numericMatch[2]?.trim() || '';
    if (chapterTitle && /^[a-z]/.test(chapterTitle)) {
      return null;
    }

    return {
      chapterToken: numericMatch[1].trim(),
      chapterTitle,
    };
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  const chapterTokens = [];
  let titleStartIndex = tokens.length;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].replace(/[.:;]+$/g, '').toUpperCase();
    if (!isWordNumberToken(token)) {
      titleStartIndex = index;
      break;
    }

    chapterTokens.push(token);
  }

  if (chapterTokens.length === 0) {
    return null;
  }

  const chapterTitle = tokens.slice(titleStartIndex).join(' ').trim();
  if (chapterTitle && /^[a-z]/.test(chapterTitle)) {
    return null;
  }

  return {
    chapterToken: chapterTokens.join(' '),
    chapterTitle,
  };
}

function isRomanNumeral(value) {
  return /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(value) && value.length > 0;
}

function romanToNumber(value) {
  const normalized = value.toUpperCase();
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  let previous = 0;

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const current = map[normalized[index]];
    if (!current) {
      return -1;
    }

    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total;
}

function chapterTokenToOrdinal(token) {
  const normalized = token.trim().toUpperCase();
  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  if (isRomanNumeral(normalized)) {
    return romanToNumber(normalized);
  }

  return -1;
}

function parsePartHeadingParts(line) {
  const normalized = normalizeChapterMarker(line);
  const match = normalized.match(/^PART\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }

  const rest = match[1].trim();
  const numericMatch = rest.match(/^([IVXLCDM]+|\d+)(?:\s*(?:[—-]|:)\s*.+)?$/i);
  if (numericMatch?.[1]) {
    return {
      partToken: numericMatch[1].trim(),
      partTitle: '',
    };
  }

  const tokens = rest
    .replace(/[—:]/g, ' - ')
    .split(/\s+/)
    .filter(Boolean);
  const partTokens = [];
  let titleStartIndex = tokens.length;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].replace(/[.:;]+$/g, '').toUpperCase();
    if (token === '-') {
      titleStartIndex = index + 1;
      break;
    }

    if (!isWordNumberToken(token)) {
      titleStartIndex = index;
      break;
    }

    partTokens.push(token);
  }

  if (partTokens.length === 0) {
    return null;
  }

  return {
    partToken: partTokens.join(' '),
    partTitle: tokens.slice(titleStartIndex).join(' ').trim(),
  };
}

function parsePhaseHeadingParts(line) {
  const normalized = normalizeChapterMarker(line);
  const match = normalized.match(/^PHASE\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }

  const rest = match[1].trim();
  const tokens = rest
    .replace(/[—:]/g, ' - ')
    .split(/\s+/)
    .filter(Boolean);
  const phaseTokens = [];
  let titleStartIndex = tokens.length;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].replace(/[.:;]+$/g, '');
    const upperToken = token.toUpperCase();
    if (upperToken === '-') {
      titleStartIndex = index + 1;
      break;
    }

    if (/^THE$/i.test(upperToken) || isWordNumberToken(upperToken)) {
      phaseTokens.push(token);
      continue;
    }

    titleStartIndex = index;
    break;
  }

  if (phaseTokens.length === 0) {
    return null;
  }

  return {
    phaseToken: phaseTokens.join(' '),
    phaseTitle: tokens.slice(titleStartIndex).join(' ').trim(),
  };
}

function isPartMarker(line) {
  return Boolean(parsePartHeadingParts(line));
}

function isPhaseMarker(line) {
  return Boolean(parsePhaseHeadingParts(line));
}

function parseBookHeadingParts(line) {
  const normalized = normalizeChapterMarker(line);
  const match = normalized.match(/^BOOK\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }

  const rest = match[1].trim();
  const numericMatch = rest.match(/^([IVXLCDM]+|\d+)(?:\s*(?:[—-]|:)\s*.+)?$/i);
  if (numericMatch?.[1]) {
    return {
      bookToken: numericMatch[1].trim(),
      bookTitle: '',
    };
  }

  const tokens = rest
    .replace(/[—:]/g, ' - ')
    .split(/\s+/)
    .filter(Boolean);
  const bookTokens = [];
  let titleStartIndex = tokens.length;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].replace(/[.:;]+$/g, '');
    const upperToken = token.toUpperCase();
    if (upperToken === '-') {
      titleStartIndex = index + 1;
      break;
    }

    if (/^BOOK$/i.test(upperToken) && bookTokens.length === 0) {
      continue;
    }

    if (/^THE$/i.test(upperToken) || isWordNumberToken(upperToken)) {
      bookTokens.push(token);
      continue;
    }

    titleStartIndex = index;
    break;
  }

  if (bookTokens.length === 0) {
    return null;
  }

  return {
    bookToken: bookTokens.join(' '),
    bookTitle: tokens.slice(titleStartIndex).join(' ').trim(),
  };
}

function isBookMarker(line) {
  return Boolean(parseBookHeadingParts(line));
}

function formatPartLabel(line) {
  const partParts = parsePartHeadingParts(line);
  if (!partParts?.partToken) {
    return '';
  }

  const partToken = /^([IVXLCDM]+|\d+)$/i.test(partParts.partToken)
    ? partParts.partToken.toUpperCase()
    : formatChapterTitleText(partParts.partToken);

  return `Part ${partToken}`;
}

function formatPhaseLabel(line) {
  const phaseParts = parsePhaseHeadingParts(line);
  if (!phaseParts?.phaseToken) {
    return '';
  }

  const phaseToken = formatChapterTitleText(phaseParts.phaseToken);
  return `Phase ${phaseToken}`;
}

function formatBookLabel(line) {
  const bookParts = parseBookHeadingParts(line);
  if (!bookParts?.bookToken) {
    return '';
  }

  const bookToken = /^([IVXLCDM]+|\d+)$/i.test(bookParts.bookToken)
    ? bookParts.bookToken.toUpperCase()
    : formatChapterTitleText(bookParts.bookToken);

  return `Book ${bookToken}`;
}

function findNearestSectionLabel(lines, fromIndex, minIndex, isMarker, formatLabel, maxDistance = 40) {
  const lowerBound = Math.max(minIndex, fromIndex - maxDistance);

  for (let index = fromIndex - 1; index >= lowerBound; index -= 1) {
    if (isMarker(lines[index])) {
      const formatted = formatLabel(lines[index]);
      if (formatted) {
        return formatted;
      }
    }
  }

  return '';
}

function formatChapterLabel(chapterLabel, chapterNumber) {
  const normalized = normalizeChapterMarker(chapterLabel);
  const chapterParts = parseChapterHeadingParts(normalized);
  if (chapterParts?.chapterToken) {
    const chapterToken = /^([IVXLCDM]+|\d+)$/i.test(chapterParts.chapterToken)
      ? chapterParts.chapterToken.toUpperCase()
      : formatChapterTitleText(chapterParts.chapterToken);
    return `Chapter ${chapterToken}`;
  }

  if (isRomanNumeral(normalized)) {
    return `Chapter ${normalized.toUpperCase()}`;
  }

  if (/^THE\s+.+\s+CHAPTER$/i.test(normalized)) {
    return `Chapter ${chapterNumber}`;
  }

  // Handle numbered chapters like "01" or "01 My Title"
  const numberedChapter = parsePlainNumberedChapterMarker(normalized);
  if (numberedChapter?.chapterToken) {
    return `Chapter ${numberedChapter.chapterToken}`;
  }

  // Handle title-only chapters — convert back to title case from normalized
  if (isTitleOnlyChapter(normalized)) {
    const titleWords = normalized.split(/\s+/);
    const titleCased = titleWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return titleCased;
  }

  return `Chapter ${chapterNumber}`;
}

function formatChapterTitleText(title) {
  const trimmed = title.trim();
  if (!trimmed) {
    return '';
  }

  const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
  if (!letterCount || upperCount / letterCount < 0.6) {
    return trimmed;
  }

  return trimmed
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function looksLikeStandaloneTitleLine(line) {
  const normalized = normalizeChapterMarker(line);
  if (!normalized || parseChapterHeadingParts(line) || looksLikeTocTitle(line)) {
    return false;
  }

  if (normalized.length > 70) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 10) {
    return false;
  }

  if (/[.!?]/.test(normalized)) {
    return false;
  }

  if (/[,:;]$/.test(line.trim())) {
    return false;
  }

  const letterCount = (line.match(/[A-Za-z]/g) || []).length;
  const upperCount = (line.match(/[A-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount >= 0.6) {
    return true;
  }

  return /^['"“‘]?[A-Z0-9]/.test(line.trim());
}

function parsePlainNumberedChapterMarker(line) {
  const trimmed = line.trim();
  if (/^\d{1,3}\.$/.test(trimmed)) {
    return null;
  }

  const normalized = normalizeChapterMarker(line);
  const match = normalized.match(/^(\d{1,3})(?:\s+(.+))?$/);
  if (!match?.[1]) {
    return null;
  }

  const chapterToken = match[1];
  const chapterTitle = match[2]?.trim() || '';
  if (!chapterTitle && !/^0\d+$/.test(chapterToken)) {
    return null;
  }

  if (chapterTitle && /^\d/.test(chapterTitle)) {
    return null;
  }

  if (chapterTitle && !looksLikeStandaloneTitleLine(chapterTitle)) {
    return null;
  }

  return {
    chapterToken,
    chapterTitle,
  };
}

function buildChapterContent(lines, heading, chapterStart, nextChapterStart) {
  const contentLines = lines.slice(chapterStart, nextChapterStart);
  return normalizeParagraphs(contentLines).join('\n\n').trim();
}

function findNextNonEmptyLine(lines, startIndex, endIndex) {
  let index = startIndex;
  while (index < endIndex && !lines[index].trim()) {
    index += 1;
  }

  return index < endIndex ? index : -1;
}

function findPreviousNonEmptyLine(lines, startIndex, minIndex = 0) {
  let index = startIndex;
  while (index >= minIndex && !lines[index].trim()) {
    index -= 1;
  }

  return index >= minIndex ? index : -1;
}

function isLikelyTocEntry(lines, chapterStart) {
  const currentNormalizedMarker = normalizeChapterMarker(lines[chapterStart]);
  const currentIsExplicitChapterHeading = Boolean(
    parseChapterHeadingParts(currentNormalizedMarker) || /^THE\s+.+\s+CHAPTER$/i.test(currentNormalizedMarker),
  );

  const hasLikelyNarrativeBody = () => {
    let nextBoundary = lines.length;
    for (let index = chapterStart + 1; index < lines.length; index += 1) {
      if (isChapterMarker(lines[index])) {
        const nextNormalizedMarker = normalizeChapterMarker(lines[index]);
        if (currentIsExplicitChapterHeading && isRomanNumeral(nextNormalizedMarker)) {
          continue;
        }

        nextBoundary = index;
        break;
      }
    }

    const heading = extractHeading(lines, chapterStart, nextBoundary);
    if (heading.contentStart < 0) {
      return false;
    }

    return hasLikelyChapterBody(lines, heading.contentStart, nextBoundary);
  };

  const hasLikelyTocInlineChapterTitle = () => {
    let nextBoundary = lines.length;
    for (let index = chapterStart + 1; index < lines.length; index += 1) {
      if (isChapterMarker(lines[index])) {
        const nextNormalizedMarker = normalizeChapterMarker(lines[index]);
        if (currentIsExplicitChapterHeading && isRomanNumeral(nextNormalizedMarker)) {
          continue;
        }

        nextBoundary = index;
        break;
      }
    }

    const heading = extractHeading(lines, chapterStart, nextBoundary);
    const chapterTitle = normalizeChapterMarker(heading.sourceChapterTitle || '');
    if (!chapterTitle) {
      return false;
    }

    return /^PREFACE\b/i.test(chapterTitle) || looksLikeTocTitle(chapterTitle);
  };

  const hasChapterNumberResetAfterCurrent = () => {
    const currentMarker = normalizeChapterMarker(lines[chapterStart]);
    const currentParts = parseChapterHeadingParts(currentMarker);
    const currentToken = currentParts?.chapterToken?.toUpperCase() || '';
    if (!currentToken || currentToken === 'I' || currentToken === '1') {
      return false;
    }

    for (let index = chapterStart + 1; index < lines.length; index += 1) {
      if (!isChapterMarker(lines[index])) {
        continue;
      }

      const nextMarker = normalizeChapterMarker(lines[index]);
      const nextParts = parseChapterHeadingParts(nextMarker);
      const nextToken = nextParts?.chapterToken?.toUpperCase() || '';
      return nextToken === 'I' || nextToken === '1';
    }

    return false;
  };

  const isTocHeadingLine = (value) => (
    /^INTRODUCTION$/i.test(value)
    || /^ORIGINAL TRANSCRIBER.?S NOTE:?$/i.test(value)
    || /^TRANSCRIBER.?S NOTE:?$/i.test(value)
    || /^NOTE:?$/i.test(value)
  );

  const isTocStructuralLine = (line) => {
    const normalized = normalizeChapterMarker(line);
    return (
      isChapterMarker(line)
      || /^\s*[IVXLCDM]+\.\s+.+$/i.test(line)
      || isPartMarker(line)
      || isPhaseMarker(line)
      || isBookMarker(line)
      || /^PREFACE$/i.test(normalized)
      || isTocHeadingLine(normalized)
    );
  };

  const currentTrimmed = lines[chapterStart].trim();
  if (/^[IVXLCDM]+\.\s*$/i.test(currentTrimmed)) {
    const previousNonEmpty = findPreviousNonEmptyLine(lines, chapterStart - 1);
    const nextNonEmpty = findNextNonEmptyLine(lines, chapterStart + 1, lines.length);
    const previousLine = previousNonEmpty >= 0 ? lines[previousNonEmpty].trim() : '';
    const nextLine = nextNonEmpty >= 0 ? lines[nextNonEmpty].trim() : '';
    const hasNumberedTocNeighbor = /^([IVXLCDM]+)\.\s+.+$/i.test(previousLine) || /^([IVXLCDM]+)\.\s+.+$/i.test(nextLine);
    if (hasNumberedTocNeighbor) {
      return true;
    }
  }

  const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
  if (previousNonEmptyIndex < 0) {
    return false;
  }

  const previousLine = normalizeChapterMarker(lines[previousNonEmptyIndex]);
  if (/^CONTENTS$/i.test(previousLine)) {
    if (hasLikelyTocInlineChapterTitle()) {
      return true;
    }

    if (hasChapterNumberResetAfterCurrent()) {
      return true;
    }

    return !hasLikelyNarrativeBody();
  }

  if (!isTocStructuralLine(lines[previousNonEmptyIndex])) {
    return false;
  }

  // Walk back through contiguous chapter-like lines to reliably detect long
  // contents blocks (some books list dozens of chapters in the TOC).
  let lookbackIndex = previousNonEmptyIndex;
  while (lookbackIndex >= 0) {
    const currentIndex = findPreviousNonEmptyLine(lines, lookbackIndex);
    if (currentIndex < 0) {
      return false;
    }

    const normalized = normalizeChapterMarker(lines[currentIndex]);
    if (/^CONTENTS$/i.test(normalized)) {
      if (hasLikelyTocInlineChapterTitle()) {
        return true;
      }

      if (hasChapterNumberResetAfterCurrent()) {
        return true;
      }

      return !hasLikelyNarrativeBody();
    }

    if (!isTocStructuralLine(lines[currentIndex])) {
      return false;
    }

    lookbackIndex = currentIndex - 1;
  }

  return false;
}

function looksLikeTocTitle(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (/\.{2,}\s*\d+$/i.test(trimmed)) {
    return true;
  }

  if (/\s+\d+\s*$/i.test(trimmed) && trimmed === trimmed.toUpperCase()) {
    return true;
  }

  return /^\s*[IVXLCDM]+\s+.+\s+\d+\s*$/i.test(trimmed);
}

function hasLikelyChapterBody(lines, fromIndex, endIndex) {
  const bodyLines = [];

  for (let index = fromIndex; index < endIndex && bodyLines.length < 4; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }

    if (/^\[Illustration:/i.test(trimmed)) {
      continue;
    }

    bodyLines.push(trimmed);
  }

  if (bodyLines.length === 0) {
    return false;
  }

  const sample = bodyLines.join(' ');
  const lowerCaseCount = (sample.match(/[a-z]/g) || []).length;
  const letterCount = (sample.match(/[A-Za-z]/g) || []).length;

  return letterCount >= 40 && lowerCaseCount >= 12;
}

function hasLikelyTitleOnlyStoryOpening(lines, fromIndex, endIndex) {
  if (fromIndex < 0 || fromIndex >= endIndex) {
    return false;
  }

  const sampleWindowEnd = Math.min(endIndex, fromIndex + 80);
  const paragraphs = normalizeParagraphs(lines.slice(fromIndex, sampleWindowEnd));
  if (paragraphs.length === 0) {
    return false;
  }

  const firstParagraph = paragraphs[0].trim();
  const wordCount = countWords(firstParagraph);
  const lowerCaseCount = (firstParagraph.match(/[a-z]/g) || []).length;
  const letterCount = (firstParagraph.match(/[A-Za-z]/g) || []).length;

  // Real story openings are usually paragraph-like prose, not title-page blocks.
  return wordCount >= 20 && letterCount >= 60 && lowerCaseCount >= 20;
}

function hasLikelyImmediateStoryOpening(lines, fromIndex, endIndex, maxLookahead = 12) {
  if (fromIndex < 0 || fromIndex >= endIndex) {
    return false;
  }

  const bodyLines = [];

  for (let index = fromIndex; index < endIndex && index < fromIndex + maxLookahead; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || /^\[Illustration:/i.test(trimmed)) {
      continue;
    }

    if (isChapterMarker(trimmed)) {
      return false;
    }

    bodyLines.push(trimmed);
  }

  if (bodyLines.length === 0) {
    return false;
  }

  const sample = bodyLines.join(' ');
  const lowerCaseCount = (sample.match(/[a-z]/g) || []).length;
  const letterCount = (sample.match(/[A-Za-z]/g) || []).length;

  return letterCount >= 40 && lowerCaseCount >= 12;
}

function isLikelyFrontMatterLine(line) {
  const normalized = normalizeChapterMarker(line);
  if (!normalized) {
    return true;
  }

  if (/^\[Illustration:/i.test(normalized)) return true;
  if (/^(BY|AUTHOR(?:S)?(?: OF)?|COPYRIGHT|CONTENTS|LIST OF ILLUSTRATIONS|VOL\.?|VOLUME|TO)\b/i.test(normalized)) return true;
  if (/^(LONDON|NEW YORK|TORONTO|MACMILLAN|DOUBLEDAY|FREDERICK WARNE|PRINTED|PUBLISHED)\b/i.test(normalized)) return true;
  if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+IMPRESSION$/i.test(normalized)) return true;
  if (/^\d{3,4}$/.test(normalized)) return true;
  return false;
}

function hasDeferredBookTitleOpening(lines, fromIndex, endIndex, normalizedBookTitle, maxLookahead = 120) {
  if (fromIndex < 0 || fromIndex >= endIndex) {
    return false;
  }

  const upperBound = Math.min(endIndex, fromIndex + maxLookahead);

  for (let index = fromIndex; index < upperBound; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || /^\[Illustration:/i.test(trimmed)) {
      continue;
    }

    const normalized = normalizeChapterMarker(trimmed);
    if (normalized.toUpperCase() === normalizedBookTitle) {
      continue;
    }

    if (isLikelyFrontMatterLine(trimmed)) {
      continue;
    }

    if (isChapterMarker(trimmed)) {
      return false;
    }

    const wordCount = countWords(trimmed);
    const lowerCaseCount = (trimmed.match(/[a-z]/g) || []).length;
    const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;

    if (wordCount >= 6 && letterCount >= 20 && lowerCaseCount >= 10) {
      return true;
    }
  }

  return false;
}

function isNumberedListStyleLine(line) {
  const normalized = normalizeChapterMarker(line);
  return /^\d{1,3}\s+.+$/.test(normalized);
}

function isWrappedProseChapterReference(lines, chapterStart, nextBoundary) {
  if (!parseChapterHeadingParts(lines[chapterStart])) {
    return false;
  }

  const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
  const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary);
  if (previousNonEmptyIndex < 0 || nextNonEmptyIndex < 0) {
    return false;
  }

  if (chapterStart - previousNonEmptyIndex !== 1) {
    return false;
  }

  const previousLine = lines[previousNonEmptyIndex].trim();
  const chapterLine = lines[chapterStart].trim();
  const nextLine = lines[nextNonEmptyIndex].trim();
  if (!previousLine || !nextLine) {
    return false;
  }

  if (
    isChapterMarker(previousLine)
    || isChapterMarker(nextLine)
    || isPartMarker(previousLine)
    || isPhaseMarker(previousLine)
    || isBookMarker(previousLine)
  ) {
    return false;
  }

  const previousLooksLikeProse = countWords(previousLine) >= 4 && /[a-z]/.test(previousLine);
  const nextLooksLikeProse = countWords(nextLine) >= 4 && /[a-z]/.test(nextLine);
  const looksLikeSentenceReference = /[.:;]$/.test(chapterLine);
  return previousLooksLikeProse && nextLooksLikeProse && looksLikeSentenceReference;
}

function isInlineRomanProseFragment(lines, chapterStart, nextBoundary) {
  const marker = normalizeChapterMarker(lines[chapterStart]);
  if (marker.toUpperCase() !== 'I') {
    return false;
  }

  const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
  const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary);
  if (previousNonEmptyIndex < 0 || nextNonEmptyIndex < 0) {
    return false;
  }

  if (chapterStart - previousNonEmptyIndex !== 1) {
    return false;
  }

  const previousLine = lines[previousNonEmptyIndex].trim();
  const nextLine = lines[nextNonEmptyIndex].trim();
  if (!previousLine || !nextLine) {
    return false;
  }

  if (
    isChapterMarker(previousLine)
    || isChapterMarker(nextLine)
    || isPartMarker(previousLine)
    || isPhaseMarker(previousLine)
    || isBookMarker(previousLine)
  ) {
    return false;
  }

  const previousLooksLikeDialogueLeadIn = /\bsaid$/i.test(previousLine) || /[a-z]$/.test(previousLine);
  const nextLooksLikeDialogueOrProse = /^["“‘]/.test(nextLine) || /^[a-z]/.test(nextLine);
  return previousLooksLikeDialogueLeadIn && nextLooksLikeDialogueOrProse;
}

function isRomanSubsectionAfterChapterHeading(lines, chapterStart) {
  const marker = normalizeChapterMarker(lines[chapterStart]);
  if (!isRomanNumeral(marker)) {
    return false;
  }

  const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
  if (previousNonEmptyIndex < 0) {
    return false;
  }

  const previousLine = normalizeChapterMarker(lines[previousNonEmptyIndex]);
  if (parseChapterHeadingParts(previousLine)) {
    return true;
  }

  const secondPreviousNonEmptyIndex = findPreviousNonEmptyLine(lines, previousNonEmptyIndex - 1);
  if (secondPreviousNonEmptyIndex < 0) {
    return false;
  }

  const secondPreviousLine = normalizeChapterMarker(lines[secondPreviousNonEmptyIndex]);
  const looksLikeStandaloneUpperTitle = (() => {
    const letterCount = (previousLine.match(/[A-Za-z]/g) || []).length;
    const upperCount = (previousLine.match(/[A-Z]/g) || []).length;
    return letterCount > 0 && upperCount / letterCount >= 0.75;
  })();

  return parseChapterHeadingParts(secondPreviousLine) && looksLikeStandaloneUpperTitle;
}

function hasExplicitChapterHeadingNearby(lines, chapterStart, maxLookback = 4000) {
  const lowerBound = Math.max(0, chapterStart - maxLookback);
  for (let index = chapterStart - 1; index >= lowerBound; index -= 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }

    if (parseChapterHeadingParts(trimmed) && !isLikelyTocEntry(lines, index)) {
      return true;
    }
  }

  return false;
}

function findFirstNarrativeStart(lines, startIndex, endIndex) {
  for (let index = startIndex; index < endIndex; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || /^\[Illustration:/i.test(trimmed)) {
      continue;
    }

    if (isChapterMarker(trimmed) || looksLikeTocTitle(trimmed)) {
      continue;
    }

    if (hasLikelyTitleOnlyStoryOpening(lines, index, endIndex)) {
      return index;
    }
  }

  return -1;
}

function findSingleStoryStart(lines, chapterCandidates, normalizedBookTitle) {
  for (const chapterStart of chapterCandidates) {
    const normalizedMarker = normalizeChapterMarker(lines[chapterStart]);
    if (!isTitleOnlyChapter(normalizedMarker)) {
      continue;
    }

    if (normalizedBookTitle && normalizedMarker.toUpperCase() === normalizedBookTitle) {
      continue;
    }

    const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
    if (previousNonEmptyIndex >= 0 && /^(BY|AUTHOR(?:S)?(?: OF)?|COPYRIGHT|TO)\b/i.test(normalizeChapterMarker(lines[previousNonEmptyIndex]))) {
      continue;
    }

    const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, lines.length);
    if (nextNonEmptyIndex < 0) {
      continue;
    }

    if (isChapterMarker(lines[nextNonEmptyIndex])) {
      continue;
    }

    if (hasLikelyImmediateStoryOpening(lines, nextNonEmptyIndex, lines.length)) {
      return chapterStart;
    }
  }

  for (const chapterStart of chapterCandidates) {
    const normalizedMarker = normalizeChapterMarker(lines[chapterStart]);
    if (normalizedMarker.toUpperCase() !== normalizedBookTitle) {
      continue;
    }

    const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, lines.length);
    if (nextNonEmptyIndex < 0) {
      continue;
    }

    if (isChapterMarker(lines[nextNonEmptyIndex])) {
      continue;
    }

    if (hasDeferredBookTitleOpening(lines, nextNonEmptyIndex, lines.length, normalizedBookTitle)) {
      return chapterStart;
    }
  }

  return -1;
}

function extractHeading(lines, chapterStart, nextBoundary) {
  const chapterLabel = normalizeChapterMarker(lines[chapterStart]);
  const chapterParts = parseChapterHeadingParts(chapterLabel);

  if (chapterParts?.chapterTitle) {
    return {
      chapterLabel,
      sourceChapterTitle: chapterParts.chapterTitle,
      contentStart: findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary),
    };
  }

  // Handle numbered chapters with inline title like "01 My Early Home"
  const inlineNumberedMatch = parsePlainNumberedChapterMarker(chapterLabel);
  if (inlineNumberedMatch?.chapterTitle) {
    return {
      chapterLabel,
      sourceChapterTitle: inlineNumberedMatch.chapterTitle,
      contentStart: findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary),
    };
  }

  // Handle title-only chapters where the marker IS the title (e.g., "THE SISTERS")
  if (isTitleOnlyChapter(chapterLabel)) {
    return {
      chapterLabel,
      sourceChapterTitle: lines[chapterStart].trim(),
      contentStart: findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary),
    };
  }

  const titleLineIndex = findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary);
  if (titleLineIndex < 0) {
    return {
      chapterLabel,
      sourceChapterTitle: '',
      contentStart: -1,
    };
  }

  const titleBlockLines = [];
  let titleBlockEndIndex = titleLineIndex;
  for (let index = titleLineIndex; index < nextBoundary; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      break;
    }

    titleBlockLines.push(trimmed);
    titleBlockEndIndex = index;
  }

  const titleBlockHasSeparator = titleBlockEndIndex + 1 < nextBoundary && !lines[titleBlockEndIndex + 1].trim();
  const looksLikeStandaloneTitleBlock = titleBlockHasSeparator && titleBlockLines.every(looksLikeStandaloneTitleLine);

  if (looksLikeStandaloneTitleBlock) {
    return {
      chapterLabel,
      sourceChapterTitle: titleBlockLines.join(' ').trim(),
      contentStart: findNextNonEmptyLine(lines, titleBlockEndIndex + 1, nextBoundary),
    };
  }

  return {
    chapterLabel,
    sourceChapterTitle: '',
    contentStart: titleLineIndex,
  };
}

function isLikelyChapterStart(lines, chapterStart, nextBoundary, normalizedBookTitle = '') {
  const normalizedMarker = normalizeChapterMarker(lines[chapterStart]);
  const parsedNumberedMarker = parsePlainNumberedChapterMarker(lines[chapterStart]);

  if (
    normalizedBookTitle
    && isTitleOnlyChapter(normalizedMarker)
    && normalizedMarker.toUpperCase() === normalizedBookTitle
  ) {
    return false;
  }

  if (isTitleOnlyChapter(normalizedMarker)) {
    if (/^\s{3,}\S/.test(lines[chapterStart])) {
      return false;
    }

    const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary);
    if (nextNonEmptyIndex >= 0 && isChapterMarker(lines[nextNonEmptyIndex])) {
      return false;
    }

    if (!hasLikelyImmediateStoryOpening(lines, nextNonEmptyIndex, nextBoundary)) {
      return false;
    }
  }

  const heading = extractHeading(lines, chapterStart, nextBoundary);
  if (heading.contentStart < 0) {
    return false;
  }

  if (/^PREFACE\b/i.test(normalizeChapterMarker(heading.sourceChapterTitle || ''))) {
    return false;
  }

  if (heading.sourceChapterTitle && looksLikeTocTitle(heading.sourceChapterTitle)) {
    return false;
  }

  if (isWrappedProseChapterReference(lines, chapterStart, nextBoundary)) {
    return false;
  }

  const hasChapterHeadingParts = Boolean(parseChapterHeadingParts(normalizedMarker));
  const hasRomanNumeralMarker = isRomanNumeral(normalizedMarker);
  const hasTheChapterMarker = /^THE\s+.+\s+CHAPTER$/i.test(normalizedMarker);

  if (hasRomanNumeralMarker && hasExplicitChapterHeadingNearby(lines, chapterStart)) {
    return false;
  }

  if (hasRomanNumeralMarker && isRomanSubsectionAfterChapterHeading(lines, chapterStart)) {
    return false;
  }

  if (hasRomanNumeralMarker && isInlineRomanProseFragment(lines, chapterStart, nextBoundary)) {
    return false;
  }

  const isExplicitChapterMarker = hasChapterHeadingParts || hasRomanNumeralMarker || hasTheChapterMarker;

  if (isExplicitChapterMarker) {
    return true;
  }

  // Plain numbered markers (e.g. "01" or "01 Prologue") are ambiguous and
  // frequently appear in front-matter lists. Require body-like prose after them.
  if (parsedNumberedMarker) {
    const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, chapterStart - 1);
    const nextNonEmptyIndex = findNextNonEmptyLine(lines, chapterStart + 1, nextBoundary);

    // Lines like "1 Item", "2 Item" usually belong to inline numbered lists,
    // not real chapter boundaries.
    if (
      (previousNonEmptyIndex >= 0 && isNumberedListStyleLine(lines[previousNonEmptyIndex]))
      || (nextNonEmptyIndex >= 0 && isNumberedListStyleLine(lines[nextNonEmptyIndex]))
    ) {
      return false;
    }

    return hasLikelyChapterBody(lines, heading.contentStart, nextBoundary);
  }

  return hasLikelyChapterBody(lines, heading.contentStart, nextBoundary);
}

function isTitleOnlyChapter(normalized) {
  // Skip if it matches other known patterns
  if (/^THE\s+.+\s+CHAPTER$/i.test(normalized)) return false;
  if (parseChapterHeadingParts(normalized)) return false;
  if (isPartMarker(normalized)) return false;
  if (isPhaseMarker(normalized)) return false;
  if (isBookMarker(normalized)) return false;
  if (/^CONTENTS$/i.test(normalized)) return false;
  if (/^PREFACE$/i.test(normalized)) return false;
  if (/^NOTE\b/i.test(normalized)) return false;
  if (/^TO\s+[A-Z]/.test(normalized)) return false;
  if (/^BY\b/i.test(normalized)) return false;
  if (/^THE END$/i.test(normalized)) return false;
  if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+IMPRESSION$/i.test(normalized)) return false;
  if (/^(IN\s+TWO\s+VOLUMES|VOL\.?\s+[IVXLC0-9]+)$/i.test(normalized)) return false;
  if (/^(LONDON|NEW YORK|AND NEW YORK|FREDERICK WARNE|GRANT AND GRIFFITH|SUCCESSORS TO)$/i.test(normalized)) return false;
  if (/^FIRST PUBLISHED(?: \d{4})?$/i.test(normalized)) return false;
  if (/^(PUBLISHED|PRINTED)\b/i.test(normalized)) return false;
  if (isRomanNumeral(normalized)) return false;
  if (parsePlainNumberedChapterMarker(normalized)) return false;

  // Title-only: mostly letters/spaces, title-like formatting, reasonably short
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount < 1 || wordCount > 8) return false;

  // Should start with uppercase and contain mostly letters/spaces/hyphens/apostrophes
  if (!/^[A-Z]/.test(normalized)) return false;
  if (!/^[A-Za-z\s\-']+$/.test(normalized)) return false;

  // Check if mostly uppercase (>60% uppercase letters) to catch titles like "THE SISTERS"
  const letterCount = (normalized.match(/[A-Za-z]/g) || []).length;
  const upperCount = (normalized.match(/[A-Z]/g) || []).length;
  if (letterCount > 0 && upperCount / letterCount >= 0.6) return true;

  return false;
}

function findRepeatedPartRestartIndex(lines) {
  const partMarkers = [];
  lines.forEach((line, index) => {
    const partParts = parsePartHeadingParts(line.trim());
    if (partParts?.partToken) {
      partMarkers.push({ index, token: partParts.partToken.toUpperCase() });
    }
  });

  if (partMarkers.length < 4) {
    return -1;
  }

  const firstToken = partMarkers[0].token;
  for (let markerIndex = 2; markerIndex < partMarkers.length; markerIndex += 1) {
    if (partMarkers[markerIndex].token !== firstToken) {
      continue;
    }

    // Require a substantial gap so we do not cut normal part transitions.
    if (partMarkers[markerIndex].index - partMarkers[0].index < 200) {
      continue;
    }

    return partMarkers[markerIndex].index;
  }

  return -1;
}

function isChapterMarker(line) {
  const normalized = normalizeChapterMarker(line);

  if (!normalized) {
    return false;
  }

  if (/^THE\s+.+\s+CHAPTER$/i.test(normalized)) {
    return true;
  }

  if (parseChapterHeadingParts(normalized)) {
    return true;
  }

  // Bare Roman numeral only — e.g. " II." or "III."
  if (isRomanNumeral(normalized)) {
    return true;
  }

  // Numbered chapters like "01", "02", or "01 My Early Home"
  if (parsePlainNumberedChapterMarker(line)) {
    return true;
  }

  // Title-only chapters like "THE SISTERS" or "AN ENCOUNTER"
  if (isTitleOnlyChapter(normalized)) {
    return true;
  }

  return false;
}

function parseChapters(text, inputPath) {
  const bodyText = trimToBookContent(text).replace(/\r\n/g, '\n');
  const lines = bodyText.split('\n');
  let chapterCandidates = [];
  const extractedBookTitle = extractBookTitle(text, inputPath);
  const normalizedBookTitle = normalizeChapterMarker(extractedBookTitle).toUpperCase();

  const explicitHeadingCandidates = [];
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = normalizeChapterMarker(lines[index]);
    if (parseChapterHeadingParts(normalized) || /^THE\s+.+\s+CHAPTER$/i.test(normalized)) {
      explicitHeadingCandidates.push(index);
    }
  }

  const explicitHeadingStarts = explicitHeadingCandidates.filter((index, candidateIndex) => {
    if (!isLikelyTocEntry(lines, index)) {
      return true;
    }

    let explicitBoundary = lines.length;
    for (let lookahead = candidateIndex + 1; lookahead < explicitHeadingCandidates.length; lookahead += 1) {
      explicitBoundary = explicitHeadingCandidates[lookahead];
      break;
    }

    const probeBoundary = Math.min(explicitBoundary, index + 140);
    const nextNonEmptyIndex = findNextNonEmptyLine(lines, index + 1, probeBoundary);
    if (nextNonEmptyIndex < 0 || isChapterMarker(lines[nextNonEmptyIndex])) {
      return false;
    }

    return hasLikelyImmediateStoryOpening(lines, nextNonEmptyIndex, probeBoundary, 16);
  });

  let normalizedExplicitHeadingStarts = explicitHeadingStarts;
  const repeatedPartRestartIndex = findRepeatedPartRestartIndex(lines);
  if (repeatedPartRestartIndex >= 0) {
    const filtered = explicitHeadingStarts.filter((index) => index >= repeatedPartRestartIndex);
    if (filtered.length >= 8) {
      normalizedExplicitHeadingStarts = filtered;
    }
  }

  const bodyPartMarkerCount = lines.filter((line) => isPartMarker(line.trim())).length;
  if (normalizedExplicitHeadingStarts.length >= 8 && bodyPartMarkerCount >= 2) {
    chapterCandidates = normalizedExplicitHeadingStarts;
  }

  if (chapterCandidates.length === 0) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!isChapterMarker(line)) {
        continue;
      }

      const normalizedLine = normalizeChapterMarker(line);
      const isExplicitChapterHeading = Boolean(
        parseChapterHeadingParts(normalizedLine) || /^THE\s+.+\s+CHAPTER$/i.test(normalizedLine),
      );

      if (isLikelyTocEntry(lines, index)) {
        if (!isExplicitChapterHeading) {
          continue;
        }

        let explicitBoundary = lines.length;
        for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
          const nextLine = lines[lookahead].trim();
          if (!nextLine) {
            continue;
          }

          const nextNormalized = normalizeChapterMarker(nextLine);
          if (
            parseChapterHeadingParts(nextNormalized)
            || /^THE\s+.+\s+CHAPTER$/i.test(nextNormalized)
            || isPartMarker(nextLine)
            || isPhaseMarker(nextLine)
            || isBookMarker(nextLine)
          ) {
            explicitBoundary = lookahead;
            break;
          }
        }

        const explicitHeading = extractHeading(lines, index, explicitBoundary);
        if (
          explicitHeading.contentStart < 0
          || !hasLikelyChapterBody(lines, explicitHeading.contentStart, explicitBoundary)
        ) {
          continue;
        }
      }

      if (isTitleOnlyChapter(normalizedLine)) {
        const previousNonEmptyIndex = findPreviousNonEmptyLine(lines, index - 1);
        if (previousNonEmptyIndex >= 0 && isChapterMarker(lines[previousNonEmptyIndex])) {
          continue;
        }
      }

      if (isChapterMarker(line)) {
        chapterCandidates.push(index);
      }
    }
  }

  if (chapterCandidates.length === 0) {
    throw new Error(`No chapter markers found in ${inputPath}`);
  }

  const explicitChapterStarts = chapterCandidates.filter((chapterStart, index) => {
    const normalizedMarker = normalizeChapterMarker(lines[chapterStart]);
    if (isTitleOnlyChapter(normalizedMarker)) {
      return false;
    }

    const nextBoundary = chapterCandidates[index + 1] ?? lines.length;
    return isLikelyChapterStart(lines, chapterStart, nextBoundary, normalizedBookTitle);
  });

  const chapterStarts = (explicitChapterStarts.length > 0 ? explicitChapterStarts : chapterCandidates.filter((chapterStart, index) => {
    const nextBoundary = chapterCandidates[index + 1] ?? lines.length;
    return isLikelyChapterStart(lines, chapterStart, nextBoundary, normalizedBookTitle);
  }));

  if (chapterStarts.length === 0) {
    const singleStoryStart = findSingleStoryStart(lines, chapterCandidates, normalizedBookTitle);
    if (singleStoryStart >= 0) {
      chapterStarts.push(singleStoryStart);
    } else {
      const narrativeStart = findFirstNarrativeStart(lines, 0, lines.length);
      if (narrativeStart >= 0) {
        const contentLines = lines.slice(narrativeStart);
        const paragraphs = normalizeParagraphs(contentLines);
        const content = [extractedBookTitle, ...paragraphs].join('\n\n').trim();
        const wordCount = countWords(content);

        return [
          {
            chapterNumber: 1,
            chapterLabel: extractedBookTitle.toUpperCase(),
            chapterDisplayLabel: formatChapterTitleText(extractedBookTitle),
            bookLabel: '',
            partLabel: '',
            sourceChapterTitle: extractedBookTitle,
            sourceFile: path.basename(inputPath),
            wordCount,
            readingTime: Math.max(1, Math.ceil(wordCount / 150)),
            content,
          },
        ];
      }

      throw new Error(`No valid chapter starts found after filtering TOC candidates in ${inputPath}`);
    }
  }

  let currentPartLabel = '';
  let currentBookLabel = '';

  return chapterStarts.map((chapterStart, chapterIndex) => {
    const previousBoundary = chapterIndex === 0 ? 0 : chapterStarts[chapterIndex - 1] + 1;
    const nextChapterStart = chapterStarts[chapterIndex + 1] ?? lines.length;
    const heading = extractHeading(lines, chapterStart, nextChapterStart);
    const normalizedHeadingLabel = normalizeChapterMarker(heading.chapterLabel);

    if (heading.contentStart < 0) {
      throw new Error(`Missing chapter title after marker at line ${chapterStart + 1}`);
    }

    const content = buildChapterContent(lines, heading, chapterStart, nextChapterStart);
    const chapterNumber = chapterIndex + 1;
    const chapterDisplayLabel = formatChapterLabel(heading.chapterLabel, chapterNumber);

    const nearestPartLabel = findNearestSectionLabel(
      lines,
      chapterStart,
      previousBoundary,
      isPartMarker,
      formatPartLabel,
      lines.length,
    );
    const nearestPhaseLabel = nearestPartLabel
      ? ''
      : findNearestSectionLabel(
        lines,
        chapterStart,
        previousBoundary,
        isPhaseMarker,
        formatPhaseLabel,
      );
    if (nearestPartLabel || nearestPhaseLabel) {
      currentPartLabel = nearestPartLabel || nearestPhaseLabel;
    }

    const nearestBookLabel = findNearestSectionLabel(
      lines,
      chapterStart,
      previousBoundary,
      isBookMarker,
      formatBookLabel,
      lines.length,
    );
    if (nearestBookLabel && normalizedHeadingLabel !== 'INTRODUCTION') {
      currentBookLabel = nearestBookLabel;
    }

    const wordCount = countWords(content);

    return {
      chapterNumber,
      chapterLabel: heading.chapterLabel,
      chapterDisplayLabel,
      bookLabel: currentBookLabel,
      partLabel: currentPartLabel,
      sourceChapterTitle: heading.sourceChapterTitle,
      sourceFile: path.basename(inputPath),
      wordCount,
      readingTime: Math.max(1, Math.ceil(wordCount / 150)),
      content,
    };
  });
}

async function parseSingleBook({
  workspaceDir,
  inputPath,
  outputDir,
  level,
  slug,
  title,
  author,
  bookDir,
  coverImg,
}) {
  const rawText = await fs.readFile(inputPath, 'utf8');
  const resolvedTitle = title || extractBookTitle(rawText, inputPath);
  const resolvedAuthor = author || extractAuthor(rawText);
  const bookId = `${level}__${slug}`;
  const parsedChapters = parseChapters(rawText, inputPath);
  const outputDirRelative = getChapterOutputRelativeDir(workspaceDir, outputDir);

  await fs.mkdir(outputDir, { recursive: true });
  const existingEntries = await fs.readdir(outputDir, { withFileTypes: true });
  await Promise.all(
    existingEntries
      .filter((entry) => entry.name === 'chapters' || /^chapter-\d+\.json$/.test(entry.name))
      .map((entry) => fs.rm(path.join(outputDir, entry.name), { recursive: true, force: true })),
  );

  const chapters = parsedChapters.map((chapter) => {
    const chapterId = `${bookId}__chapter-${chapter.chapterNumber}`;
    const formattedSourceChapterTitle = formatChapterTitleText(chapter.sourceChapterTitle);
    const chapterTitleCore = !formattedSourceChapterTitle
      ? chapter.chapterDisplayLabel
      : normalizeChapterMarker(chapter.chapterDisplayLabel) === normalizeChapterMarker(formattedSourceChapterTitle)
        ? chapter.chapterDisplayLabel
        : `${chapter.chapterDisplayLabel} - ${formattedSourceChapterTitle}`;
    const chapterTitlePrefix = [chapter.bookLabel, chapter.partLabel].filter(Boolean).join(' - ');
    const combinedChapterTitle = chapterTitlePrefix
      ? `${chapterTitlePrefix} - ${chapterTitleCore}`
      : chapterTitleCore;
    const sourceChapterMarker = chapterTitlePrefix
      ? `${chapterTitlePrefix} - ${chapter.chapterLabel}`
      : chapter.chapterLabel;
    const chapterFileName = `chapter-${chapter.chapterNumber}.json`;

    return {
      id: chapterId,
      bookId,
      level,
      slug,
      title: resolvedTitle,
      author: resolvedAuthor,
      chapterTitle: combinedChapterTitle,
      chapterFile: `${outputDirRelative}/${chapterFileName}`,
      chapterIndex: chapter.chapterNumber - 1,
      chapterNumber: chapter.chapterNumber,
      sourceBookLabel: chapter.bookLabel || undefined,
      sourcePartLabel: chapter.partLabel || undefined,
      sourceChapterMarker,
      sourceChapterTitle: chapter.sourceChapterTitle,
      bookDir,
      coverImg,
      content: chapter.content,
      wordCount: chapter.wordCount,
      readingTime: chapter.readingTime,
    };
  });
  const chapterMetadata = chapters.map(buildChapterMetadata);

  await Promise.all(
    chapters.map((chapter) =>
      fs.writeFile(
        path.join(outputDir, `chapter-${chapter.chapterNumber}.json`),
        `${JSON.stringify(chapter, null, 2)}\n`,
        'utf8',
      ),
    ),
  );

  const manifest = {
    id: bookId,
    level,
    slug,
    title: resolvedTitle,
    author: resolvedAuthor,
    coverImg,
    bookDir,
    sourceFile: toPosixPath(path.relative(workspaceDir, inputPath)),
    chapterCount: chapters.length,
    generatedAt: new Date().toISOString(),
    chapters: chapterMetadata,
  };

  await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, 'chapters.json'), `${JSON.stringify(chapterMetadata, null, 2)}\n`, 'utf8');
  await syncBooksManifestEntry(workspaceDir, outputDir, manifest);

  console.log(`Parsed ${chapters.length} chapters from ${toPosixPath(path.relative(workspaceDir, inputPath))} into ${toPosixPath(path.relative(workspaceDir, outputDir))}.`);
}

async function parseAllBooks({ workspaceDir, booksDir, levelsFile }) {
  const booksDirPath = path.resolve(workspaceDir, booksDir);
  const levelsFilePath = path.resolve(workspaceDir, levelsFile);
  const levelsText = await fs.readFile(levelsFilePath, 'utf8');
  const levelMap = parseLevelMap(levelsText);
  const entries = await fs.readdir(booksDirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const missingLevels = [];

  for (const fileName of files) {
    const inputPath = path.join(booksDirPath, fileName);
    const rawText = await fs.readFile(inputPath, 'utf8');
    const title = extractBookTitle(rawText, inputPath);
    const author = extractAuthor(rawText);
    const slug = path.basename(fileName, '.txt');
    const level = resolveBookLevel(levelMap, title, slug);

    if (!level) {
      missingLevels.push(`${fileName}: ${title}`);
      continue;
    }

    await parseSingleBook({
      workspaceDir,
      inputPath,
      outputDir: path.resolve(workspaceDir, 'resource', 'books-json', 'chapters', slug),
      level,
      slug,
      title,
      author,
      bookDir: `/${slug}`,
      coverImg: `/covers/${slug}.jpg`,
    });
  }

  if (missingLevels.length > 0) {
    throw new Error(`Missing level mapping for:\n${missingLevels.join('\n')}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  const workspaceDir = process.cwd();

  if (options.all) {
    await parseAllBooks({
      workspaceDir,
      booksDir: options.booksDir,
      levelsFile: options.levelsFile,
    });
    return;
  }

  if (!options.input) {
    throw new Error('Provide --input for a single book or use --all to parse the entire books folder.');
  }

  const inputPath = path.resolve(workspaceDir, options.input);
  const rawText = await fs.readFile(inputPath, 'utf8');
  const inferredTitle = extractBookTitle(rawText, inputPath);
  const inferredAuthor = extractAuthor(rawText);
  const inferredSlug = options.slug || path.basename(inputPath, path.extname(inputPath));
  const levelsText = await fs.readFile(path.resolve(workspaceDir, options.levelsFile), 'utf8');
  const levelMap = parseLevelMap(levelsText);
  const resolvedLevel = options.level || resolveBookLevel(levelMap, options.title || inferredTitle, inferredSlug);

  if (!resolvedLevel) {
    throw new Error(`Unable to resolve level for ${options.title || inferredTitle} from ${options.levelsFile}.`);
  }

  await parseSingleBook({
    workspaceDir,
    inputPath,
    outputDir: path.resolve(workspaceDir, 'resource', 'books-json', 'chapters', inferredSlug),
    level: resolvedLevel,
    slug: inferredSlug,
    title: options.title || inferredTitle,
    author: options.author || inferredAuthor,
    bookDir: options.bookDir || `/${inferredSlug}`,
    coverImg: options.coverImg || `/covers/${inferredSlug}.jpg`,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});