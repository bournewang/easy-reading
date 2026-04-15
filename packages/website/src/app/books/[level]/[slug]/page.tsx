import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { getAllBooks, getBookChapterReaderUrl, getBookPageData } from '@/lib/books';

type Props = {
  params: {
    level: string;
    slug: string;
  };
  searchParams?: {
    chapter?: string;
  };
};

export async function generateStaticParams() {
  const books = await getAllBooks();
  return books.map((book) => ({
    level: book.level,
    slug: book.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getBookPageData(params.level, params.slug);

  if (!data) {
    return {};
  }

  return {
    title: `${data.book.title}`,
    description: data.description,
    alternates: {
      canonical: absoluteUrl(`/books/${data.level.id}/${data.book.slug}`),
    },
    openGraph: {
      title: `${data.book.title} | English Reader`,
      description: data.description,
      url: absoluteUrl(`/books/${data.level.id}/${data.book.slug}`),
      type: 'book',
      images: data.book.assetCoverImg ? [absoluteUrl(data.book.assetCoverImg)] : [],
    },
  };
}

export default async function BookDetailPage({ params, searchParams }: Props) {
  const data = await getBookPageData(params.level, params.slug);

  if (!data || !data.firstChapter || data.chapters.length === 0) {
    notFound();
  }

  const requestedChapter = Number(searchParams?.chapter || '');
  const chapterNumber =
    Number.isFinite(requestedChapter) && requestedChapter > 0
      ? requestedChapter
      : data.chapters[0].chapterNumber;

  redirect(
    getBookChapterReaderUrl(
      data.book.level,
      data.book.slug,
      chapterNumber,
    ),
  );
}
