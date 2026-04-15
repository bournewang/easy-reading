import { notFound, redirect } from 'next/navigation';
import { getIELTSArticlesForTest } from '@/lib/ielts';
import { getIELTSPassageReaderUrl } from '@/lib/ielts-paths';

type IELTSReaderPageProps = {
  params: {
    year: string;
    month: string;
    test: string;
  };
  searchParams?: {
    passage?: string;
  };
};

export default async function IELTSReaderPage({ params, searchParams }: IELTSReaderPageProps) {
  const passages = await getIELTSArticlesForTest(params.year, params.month, params.test);

  if (passages.length === 0) {
    notFound();
  }

  const requestedPassage = searchParams?.passage;
  const matchedPassage = requestedPassage
    ? passages.find((passage) => passage.passage === requestedPassage)
    : null;
  const targetPassage = matchedPassage || passages[0];

  redirect(
    getIELTSPassageReaderUrl(
      params.year,
      params.month,
      params.test,
      targetPassage.passage,
    ),
  );
}
