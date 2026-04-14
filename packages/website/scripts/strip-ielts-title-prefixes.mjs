import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const articlesDir = path.resolve(__dirname, '../src/data/ielts-articles');
const dryRun = process.argv.includes('--dry-run');

const filePattern = /^ielts-\d{4}-[a-z]+-test-\d+-passage-\d+\.ts$/i;
const titlePattern =
  /(title:\s*)(['"`])IELTS\s+\d{4}\s+[A-Za-z]+\s+Test\s+\d+\s*-\s*([^'"`]+)\2/;

async function main() {
  const entries = await fs.readdir(articlesDir, { withFileTypes: true });
  const targetFiles = entries
    .filter((entry) => entry.isFile() && filePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let updatedCount = 0;

  for (const fileName of targetFiles) {
    const filePath = path.join(articlesDir, fileName);
    const source = await fs.readFile(filePath, 'utf8');
    const nextSource = source.replace(titlePattern, (_, prefix, quote, title) => {
      return `${prefix}${quote}${title.trim()}${quote}`;
    });

    if (nextSource === source) {
      continue;
    }

    updatedCount += 1;

    if (!dryRun) {
      await fs.writeFile(filePath, nextSource, 'utf8');
    }
  }

  console.log(
    `${dryRun ? 'Would update' : 'Updated'} ${updatedCount} IELTS article title${
      updatedCount === 1 ? '' : 's'
    }.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
