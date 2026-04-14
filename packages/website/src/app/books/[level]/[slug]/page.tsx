import Script from 'next/script';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BookReaderClient from '@/components/books/BookReaderClient';
import { absoluteUrl } from '@/lib/seo';
import { buildBookArticle, getAllBooks, getBookPageData, getBookLevel } from '@/lib/books';

type Props = {
  params: {
    level: string;
    slug: string;
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

export default async function BookDetailPage({ params }: Props) {
  const data = await getBookPageData(params.level, params.slug);
  const level = getBookLevel(params.level);

  if (!data || !level || !data.firstChapter) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: data.book.title,
    author: data.book.author
      ? {
          '@type': 'Person',
          name: data.book.author,
        }
      : undefined,
    image: data.book.assetCoverImg ? absoluteUrl(data.book.assetCoverImg) : undefined,
    description: data.description,
    url: absoluteUrl(`/books/${data.level.id}/${data.book.slug}`),
    isPartOf: {
      '@type': 'CollectionPage',
      name: level.label,
      url: absoluteUrl(`/books/${level.id}`),
    },
    numberOfPages: data.book.chapterCount,
    educationalLevel: level.shortLabel,
  };
  const initialArticle = buildBookArticle({
    book: data.book,
    levelLabel: level.shortLabel,
    chapter: {
      id: data.chapters[0].id,
      content: data.firstChapter.content,
      chapterIndex: data.chapters[0].chapterIndex,
      chapterTitle: data.firstChapter.chapterTitle,
      readingTime: data.chapters[0].readingTime,
      wordCount: data.chapters[0].wordCount,
    },
  });

  return (
    <>
      <Script
        id={`book-schema-${data.book.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <BookReaderClient
        book={data.book}
        chapters={data.chapters}
        levelLabel={level.shortLabel}
        initialArticle={initialArticle}
      />
    </>
  );
}
