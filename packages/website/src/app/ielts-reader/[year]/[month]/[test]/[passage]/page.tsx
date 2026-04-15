import { notFound } from 'next/navigation';
import type { Article } from '@easy-reading/shared';
import IELTSTestReaderClient from '@/components/ielts/IELTSTestReaderClient';
import {
  getIELTSArticleById,
  getIELTSArticleList,
  getIELTSArticlesForTest,
  getIELTSTestSummary,
} from '@/lib/ielts';

type IELTSPassageReaderPageProps = {
  params: {
    year: string;
    month: string;
    test: string;
    passage: string;
  };
};

export const dynamicParams = false;
export const dynamic = 'force-static';

export async function generateStaticParams() {
  const articles = await getIELTSArticleList();

  return articles.map((article) => ({
    year: article.year,
    month: article.month,
    test: article.test,
    passage: article.passage,
  }));
}

export default async function IELTSPassageReaderPage({ params }: IELTSPassageReaderPageProps) {
  const allArticles = await getIELTSArticleList();
  const summary = await getIELTSTestSummary(params.year, params.month, params.test);
  const passages = await getIELTSArticlesForTest(params.year, params.month, params.test);

  if (!summary || passages.length === 0) {
    notFound();
  }

  const activePassage = passages.find((passage) => passage.passage === params.passage);
  if (!activePassage) {
    notFound();
  }

  const articleEntries = await Promise.all(
    passages.map(async (passage) => [passage.id, await getIELTSArticleById(passage.id)] as const),
  );
  const articlesById = articleEntries.reduce<Record<string, Article>>((acc, [id, article]) => {
    if (article) {
      acc[id] = article;
    }
    return acc;
  }, {});

  const allTests = Array.from(
    new Map(
      allArticles.map((article) => [
        `${article.year}-${article.month}-${article.test}`,
        {
          year: article.year,
          month: article.month,
          test: article.test,
        },
      ]),
    ).values(),
  );

  return (
    <IELTSTestReaderClient
      summary={summary}
      passages={passages}
      articlesById={articlesById}
      allTests={allTests}
      initialPassage={params.passage}
    />
  );
}
