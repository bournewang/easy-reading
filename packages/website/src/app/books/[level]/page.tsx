import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import { absoluteUrl } from '@/lib/seo';
import { BOOK_LEVELS, getBookLevel, getBooksForLevel } from '@/lib/books';
import { BookLevelPageClient } from '@/components/books/BookLevelPageClient';

type Props = {
  params: {
    level: string;
  };
};

export async function generateStaticParams() {
  return BOOK_LEVELS.map((level) => ({ level: level.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const level = getBookLevel(params.level);

  if (!level) {
    return {};
  }

  return {
    title: `${level.label}`,
    description: `${level.description} Browse ${level.shortLabel} books with in-context translation, dictionary lookup, and text-to-speech support.`,
    alternates: {
      canonical: absoluteUrl(`/books/${level.id}`),
    },
    openGraph: {
      title: `${level.label} | English Reader`,
      description: level.description,
      url: absoluteUrl(`/books/${level.id}`),
      type: 'website',
    },
  };
}

export default async function BookLevelPage({ params }: Props) {
  const levelData = await getBooksForLevel(params.level);

  if (!levelData) {
    notFound();
  }

  return (
    <PageShell>
      <BookLevelPageClient
        levelData={levelData}
        levels={BOOK_LEVELS.map((level) => ({ id: level.id, shortLabel: level.shortLabel }))}
      />
    </PageShell>
  );
}
