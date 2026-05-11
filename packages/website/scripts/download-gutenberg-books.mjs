#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const GUTENBERG_BASE_URL = 'https://www.gutenberg.org';

function parseArgs(argv) {
  const options = {
    titlesFile: '',
    titles: '',
    outputDir: 'books',
    overwrite: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--titles-file') {
      options.titlesFile = argv[index + 1] || options.titlesFile;
      index += 1;
      continue;
    }

    if (arg === '--titles') {
      options.titles = argv[index + 1] || options.titles;
      index += 1;
      continue;
    }

    if (arg === '--output-dir') {
      options.outputDir = argv[index + 1] || options.outputDir;
      index += 1;
      continue;
    }

    if (arg === '--overwrite') {
      options.overwrite = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

function showHelp() {
  console.log(`Download Gutenberg plain-text books and save as slug files.

Usage:
  node ./scripts/download-gutenberg-books.mjs --titles-file ./book-titles.txt
  node ./scripts/download-gutenberg-books.mjs --titles "Title One|Title Two"
  node ./scripts/download-gutenberg-books.mjs --titles "Alice's Adventures in Wonderland\nThe Secret Garden"

Options:
  --titles-file <path>   Newline-separated book titles
  --titles <value>       Book titles separated by newlines or "|"
  --output-dir <path>    Output directory (default: books)
  --overwrite            Overwrite existing files
  --dry-run              Search only, do not download files
  --help, -h             Show this help

Title matching:
  - searches https://www.gutenberg.org/ebooks/search/
  - picks the best title match from the first page
  - tries common plain-text URLs for the selected book id
`);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseTitlesFromValue(value) {
  if (!value) {
    return [];
  }

  let normalized = value.trim();

  // Allow pasted blocks wrapped in matching quotes.
  if (
    normalized.length >= 2
    && ((normalized.startsWith('"') && normalized.endsWith('"'))
      || (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  // Support escaped newlines for CLI inputs such as "Title A\\nTitle B".
  normalized = normalized.replace(/\\n/g, '\n');

  return normalized
    .split(/\r?\n|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function readTitles(options) {
  if (options.titlesFile) {
    const raw = await fs.readFile(path.resolve(process.cwd(), options.titlesFile), 'utf8');
    return parseTitlesFromValue(raw);
  }

  if (options.titles) {
    return parseTitlesFromValue(options.titles);
  }

  return [];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'easy-reading/1.0 (book-downloader)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractSearchResults(html) {
  const results = [];
  const itemRegex = /<li\s+class="booklink"[\s\S]*?<\/li>/gi;
  const idRegex = /href="\/ebooks\/(\d+)"/i;
  const titleRegex = /<span\s+class="title"[^>]*>([\s\S]*?)<\/span>/i;

  for (const item of html.match(itemRegex) || []) {
    const idMatch = item.match(idRegex);
    const titleMatch = item.match(titleRegex);

    if (!idMatch?.[1] || !titleMatch?.[1]) {
      continue;
    }

    const id = idMatch[1].trim();
    const title = decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim();

    if (!id || !title) {
      continue;
    }

    results.push({ id, title });
  }

  return results;
}

function scoreMatch(inputTitle, candidateTitle) {
  const left = normalizeTitle(inputTitle);
  const right = normalizeTitle(candidateTitle);

  if (!left || !right) {
    return -1;
  }

  if (left === right) {
    return 100;
  }

  if (right.startsWith(left)) {
    return 85;
  }

  if (right.includes(left)) {
    return 70;
  }

  const leftWords = new Set(left.split(' '));
  const rightWords = new Set(right.split(' '));
  let overlap = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) {
      overlap += 1;
    }
  }

  const coverage = overlap / Math.max(1, leftWords.size);
  return Math.round(coverage * 50);
}

function pickBestResult(inputTitle, candidates) {
  let best = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = scoreMatch(inputTitle, candidate.title);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return {
    best,
    bestScore,
  };
}

function buildTextCandidates(bookId) {
  return [
    `${GUTENBERG_BASE_URL}/cache/epub/${bookId}/pg${bookId}.txt`,
    `${GUTENBERG_BASE_URL}/files/${bookId}/${bookId}-0.txt`,
    `${GUTENBERG_BASE_URL}/files/${bookId}/${bookId}.txt`,
    `${GUTENBERG_BASE_URL}/ebooks/${bookId}.txt.utf-8`,
    `${GUTENBERG_BASE_URL}/ebooks/${bookId}.txt.noimages`,
  ];
}

function isLikelyBookText(text) {
  const normalized = text.trim();

  if (normalized.length < 1200) {
    return false;
  }

  return /PROJECT GUTENBERG/i.test(normalized) || /\*\*\* START OF/i.test(normalized);
}

async function downloadBookPlainText(bookId) {
  const textCandidates = buildTextCandidates(bookId);
  const errors = [];

  for (const url of textCandidates) {
    try {
      const text = await fetchText(url);
      if (isLikelyBookText(text)) {
        return {
          url,
          text,
        };
      }
      errors.push(`${url} -> content is not plain book text`);
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }

  throw new Error(`Unable to download plain text for book id ${bookId}\n${errors.join('\n')}`);
}

async function findBookOnGutenberg(title) {
  const url = `${GUTENBERG_BASE_URL}/ebooks/search/?query=${encodeURIComponent(title)}`;
  const html = await fetchText(url);
  const candidates = extractSearchResults(html);

  if (candidates.length === 0) {
    return {
      searchUrl: url,
      match: null,
      score: -1,
    };
  }

  const { best, bestScore } = pickBestResult(title, candidates);

  return {
    searchUrl: url,
    match: best,
    score: bestScore,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  const titles = await readTitles(options);

  if (titles.length === 0) {
    throw new Error('No titles provided. Use --titles-file or --titles.');
  }

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const summary = {
    success: 0,
    skipped: 0,
    failed: 0,
  };

  for (const title of titles) {
    const slug = slugify(title);
    const outputFile = path.join(outputDir, `${slug}.txt`);

    try {
      if (!options.overwrite) {
        try {
          await fs.access(outputFile);
          console.log(`SKIP: ${title} -> already exists (${outputFile})`);
          summary.skipped += 1;
          continue;
        } catch {
          // File does not exist, continue.
        }
      }

      const located = await findBookOnGutenberg(title);
      if (!located.match || located.score < 40) {
        throw new Error(
          `No confident match found (score=${located.score}). Search URL: ${located.searchUrl}`,
        );
      }

      console.log(`MATCH: ${title} -> [${located.match.id}] ${located.match.title} (score=${located.score})`);

      if (options.dryRun) {
        summary.success += 1;
        continue;
      }

      const downloaded = await downloadBookPlainText(located.match.id);
      await fs.writeFile(outputFile, downloaded.text, 'utf8');

      console.log(`SAVE: ${outputFile} <- ${downloaded.url}`);
      summary.success += 1;
    } catch (error) {
      console.error(`FAIL: ${title} -> ${error.message}`);
      summary.failed += 1;
    }
  }

  console.log(
    `Done. success=${summary.success} skipped=${summary.skipped} failed=${summary.failed} output=${outputDir}`,
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
