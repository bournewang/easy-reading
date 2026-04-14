import fs from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve(process.cwd(), 'public/book-files');
const outputRoot = path.resolve(process.cwd(), 'public/books-json');
const chaptersDir = path.join(outputRoot, 'chapters');

const bookIndexFiles = [
  'index-a1.json',
  'index-a2.json',
  'index-b11.json',
  'index-b12.json',
  'index-b21.json',
  'index-b22.json',
  'index-c1.json',
];

function decodeHtmlEntities(value) {
  return value
    .replace(/&#10;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function slugFromBookDir(bookDir) {
  return String(bookDir || '')
    .replace(/^\/?books\//, '')
    .replace(/^\/+/, '');
}

function chapterIdFromParts(level, slug, chapterFile) {
  return `${level}__${slug}__${chapterFile.replace(/\.html?$/i, '')}`;
}

function extractChapterTitle(html, chapterFile, chapterIndex) {
  const titleMatch = html.match(/<div class="chapter-title">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) {
    const title = stripHtml(titleMatch[1]);
    if (title) {
      return title;
    }
  }

  return chapterFile.replace(/\.html?$/i, '') || `Chapter ${chapterIndex + 1}`;
}

function extractContentHtml(html) {
  const contentMatch = html.match(/<div class="content">([\s\S]*?)<\/div>/i);
  return contentMatch ? contentMatch[1].trim() : '';
}

function extractTextContent(html) {
  const paragraphMatches = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi));
  if (paragraphMatches.length > 0) {
    return paragraphMatches
      .map((match) => stripHtml(match[1]))
      .filter(Boolean)
      .join('\n\n');
  }

  return stripHtml(html);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const chapterResources = [];
  const chapterManifest = [];
  const booksManifest = [];

  await fs.mkdir(chaptersDir, { recursive: true });
  await fs.rm(path.join(outputRoot, 'index.json'), { force: true });
  await fs.rm(path.join(outputRoot, 'chapters-index.json'), { force: true });

  for (const indexFile of bookIndexFiles) {
    const level = indexFile.replace(/^index-/, '').replace(/\.json$/, '');
    const indexPath = path.join(sourceRoot, indexFile);
    const indexData = await readJson(indexPath);
    const books = Array.isArray(indexData.books) ? indexData.books : [];

    for (const book of books) {
      const slug = slugFromBookDir(book.book_dir);
      const chapters = Array.isArray(book.chapters) ? book.chapters : [];

      booksManifest.push({
        id: `${level}__${slug}`,
        level,
        slug,
        title: book.title,
        author: book.author || '',
        coverImg: book.coverImg || null,
        original: book.original || '',
        bookDir: book.book_dir,
        chapterCount: chapters.length,
      });

      for (let index = 0; index < chapters.length; index += 1) {
        const chapterFile = chapters[index];
        const chapterPath = path.join(sourceRoot, slug, chapterFile);
        const rawHtml = await fs.readFile(chapterPath, 'utf8');
        const contentHtml = extractContentHtml(rawHtml);
        const content = extractTextContent(contentHtml || rawHtml);
        const chapterTitle = extractChapterTitle(rawHtml, chapterFile, index);
        const wordCount = countWords(content);
        const id = chapterIdFromParts(level, slug, chapterFile);

        const chapterResource = {
          id,
          bookId: `${level}__${slug}`,
          level,
          slug,
          title: book.title,
          author: book.author || '',
          chapterTitle,
          chapterFile,
          chapterIndex: index,
          chapterNumber: index + 1,
          bookDir: book.book_dir,
          coverImg: book.coverImg || null,
          content,
          wordCount,
          readingTime: Math.max(1, Math.ceil(wordCount / 150)),
        };

        chapterResources.push(chapterResource);
        const { content: _content, ...manifestItem } = chapterResource;
        chapterManifest.push(manifestItem);
      }
    }
  }

  await Promise.all(
    chapterResources.map((chapter) =>
      fs.writeFile(
        path.join(chaptersDir, `${chapter.id}.json`),
        `${JSON.stringify(chapter, null, 2)}\n`,
        'utf8',
      ),
    ),
  );

  await fs.writeFile(
    path.join(outputRoot, 'chapters.json'),
    `${JSON.stringify(chapterManifest, null, 2)}\n`,
    'utf8',
  );

  await fs.writeFile(
    path.join(outputRoot, 'books.json'),
    `${JSON.stringify(booksManifest, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `Exported ${chapterResources.length} book chapters across ${booksManifest.length} books to ${outputRoot}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
