import fs from 'node:fs/promises';
import path from 'node:path';

const booksJsonDir = path.resolve(process.cwd(), 'public/books-json');
const booksJsonPath = path.join(booksJsonDir, 'books.json');
const coversDir = path.join(booksJsonDir, 'covers');
const coverExtensions = ['.jpg', '.png', '.webp'];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function findCoverForSlug(slug) {
  for (const extension of coverExtensions) {
    const fileName = `${slug}${extension}`;
    const fullPath = path.join(coversDir, fileName);

    if (await fileExists(fullPath)) {
      return `/covers/${fileName}`;
    }
  }

  return null;
}

async function main() {
  const books = await readJson(booksJsonPath);

  if (!Array.isArray(books)) {
    throw new Error(`Expected an array in ${booksJsonPath}`);
  }

  let updatedCount = 0;
  let matchedCount = 0;

  const nextBooks = await Promise.all(
    books.map(async (book) => {
      const slug = typeof book?.slug === 'string' ? book.slug : '';
      if (!slug) {
        return book;
      }

      const matchedCover = await findCoverForSlug(slug);
      if (!matchedCover) {
        return book;
      }

      matchedCount += 1;

      if (book.coverImg === matchedCover) {
        return book;
      }

      updatedCount += 1;
      return {
        ...book,
        coverImg: matchedCover,
      };
    }),
  );

  await fs.writeFile(booksJsonPath, `${JSON.stringify(nextBooks, null, 2)}\n`, 'utf8');

  console.log(
    `Synced coverImg for ${matchedCount} books with slug-based covers. Updated ${updatedCount} records in ${booksJsonPath}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
