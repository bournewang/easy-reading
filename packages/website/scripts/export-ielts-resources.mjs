import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve(process.cwd(), 'src/data/ielts-articles');
const outputRoot = path.resolve(process.cwd(), 'public/ielts-articles');
const articlesDir = path.join(outputRoot, 'articles');

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function loadArticleFromSource(source) {
  const executable = source
    .replace(/^import\s+\{\s*Article\s*\}\s+from\s+['"][^'"]+['"];\s*/m, '')
    .replace(/const article:\s*Article\s*=\s*/, 'const article = ')
    .replace(/\nexport default article;\s*$/m, '\nreturn article;\n');

  return new Function(executable)();
}

function normalizeArticle(rawArticle) {
  if (typeof rawArticle?.id !== 'string') {
    return null;
  }

  const match = rawArticle.id.match(/^(\d{4})-([a-z]+)-test-(\d+)-passage-(\d+)$/i);
  if (!match) {
    return null;
  }

  const [, year, month, test, passage] = match;
  const content = typeof rawArticle.content === 'string' ? rawArticle.content : '';
  const wordCount =
    typeof rawArticle.word_count === 'number' && Number.isFinite(rawArticle.word_count)
      ? rawArticle.word_count
      : countWords(content);

  return {
    id: rawArticle.id,
    title: rawArticle.title,
    content,
    source: rawArticle.source || 'IELTS Reading',
    level: rawArticle.level || 'IELTS',
    category: rawArticle.category || 'IELTS Reading',
    publishedAt: rawArticle.publishedAt,
    wordCount,
    readingTime:
      typeof rawArticle.reading_time === 'number' && Number.isFinite(rawArticle.reading_time)
        ? rawArticle.reading_time
        : Math.max(1, Math.ceil(wordCount / 150)),
    year,
    month,
    test,
    passage,
  };
}

function toManifestItem(article) {
  const { content, ...manifestItem } = article;
  return manifestItem;
}

async function main() {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const sourceFiles = entries
    .filter((entry) => entry.isFile() && /^ielts-\d{4}-[a-z]+-test-\d+-passage-\d+\.ts$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const articles = [];
  for (const fileName of sourceFiles) {
    const filePath = path.join(sourceDir, fileName);
    const rawSource = await fs.readFile(filePath, 'utf8');
    const article = normalizeArticle(loadArticleFromSource(rawSource));

    if (article) {
      articles.push(article);
    }
  }

  await fs.mkdir(articlesDir, { recursive: true });

  await Promise.all(
    articles.map((article) =>
      fs.writeFile(
        path.join(articlesDir, `${article.id}.json`),
        `${JSON.stringify(article, null, 2)}\n`,
        'utf8',
      ),
    ),
  );

  await fs.writeFile(
    path.join(outputRoot, 'index.json'),
    `${JSON.stringify(articles.map(toManifestItem), null, 2)}\n`,
    'utf8',
  );

  console.log(`Exported ${articles.length} IELTS article resources to ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
