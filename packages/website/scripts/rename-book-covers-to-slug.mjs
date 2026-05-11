#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const booksJsonPath = path.resolve(process.cwd(), 'resource/books-json/books.json');
const coversDir = path.resolve(process.cwd(), 'public/covers');
const md5CoverPattern = /^\/covers\/([a-f0-9]{32})\.([a-z0-9]+)$/i;

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const books = await readJson(booksJsonPath);

  if (!Array.isArray(books)) {
    throw new Error(`Expected an array in ${booksJsonPath}`);
  }

  let renamedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const skipped = [];

  const nextBooks = [];

  for (const book of books) {
    const slug = typeof book?.slug === "string" ? book.slug.trim() : '';
    const coverImg = typeof book?.coverImg === "string" ? book.coverImg.trim() : '';
    const match = coverImg.match(md5CoverPattern);

    if (!slug || !match) {
      nextBooks.push(book);
      unchangedCount += 1;
      continue;
    }

    const [, hash, extension] = match;
    const sourceFileName = `${hash}.${extension}`;
    const targetFileName = `${slug}.${extension}`;
    const sourceFilePath = path.join(coversDir, sourceFileName);
    const targetFilePath = path.join(coversDir, targetFileName);
    const nextCoverImg = `/covers/${targetFileName}`;

    const sourceExists = await pathExists(sourceFilePath);
    const targetExists = await pathExists(targetFilePath);

    if (!sourceExists) {
      if (targetExists) {
        nextBooks.push({
          ...book,
          coverImg: nextCoverImg,
        });
        updatedCount += 1;
        continue;
      }

      skipped.push(`${slug}: missing source file ${sourceFileName}`);
      nextBooks.push(book);
      continue;
    }

    if (sourceFilePath !== targetFilePath && targetExists) {
      skipped.push(`${slug}: target file already exists (${targetFileName}), source left unchanged`);
      nextBooks.push({
        ...book,
      });
      continue;
    }

    if (options.dryRun) {
      console.log(`[dry-run] rename ${sourceFileName} -> ${targetFileName}`);
    } else if (sourceFilePath !== targetFilePath) {
      await fs.rename(sourceFilePath, targetFilePath);
    }

    renamedCount += 1;
    updatedCount += 1;
    nextBooks.push({
      ...book,
      coverImg: nextCoverImg,
    });
  }

  if (!options.dryRun) {
    await fs.writeFile(booksJsonPath, `${JSON.stringify(nextBooks, null, 2)}\n`, 'utf8');
  }

  console.log(
    `${options.dryRun ? 'Would rename' : 'Renamed'} ${renamedCount} cover file(s) and ${options.dryRun ? 'would update' : 'updated'} ${updatedCount} book record(s). ${unchangedCount} record(s) unchanged.`,
  );

  if (skipped.length) {
    console.warn(`Skipped ${skipped.length} item(s):`);
    for (const message of skipped) {
      console.warn(`- ${message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
