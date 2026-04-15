import Script from 'next/script';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BookReaderClient from '@/components/books/BookReaderClient';
import { absoluteUrl } from '@/lib/seo';
import {
  buildBookArticle,
  getAllBooks,
  getBookChapterPageData,
  getBookChapterReaderUrl,
  getBookLevel,
  getBookPageData,
} from '@/lib/books';

type Props = {
  params: {
    level: string;
    slug: string;
    chapter: string;
  };
};

export async function generateStaticParams() {
  const books = await getAllBooks();
  const params = await Promise.all(
    books.map(async (book) => {
      const data = await getBookPageData(book.level, book.slug);
      const chapters = data?.chapters || [];

      return chapters.map((chapter) => ({
        level: book.level,
        slug: book.slug,
        chapter: String(chapter.chapterNumber),
      }));
    }),
  );

  return params.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chapterNumber = Number(params.chapter);
  const data = await getBookChapterPageData(params.level, params.slug, chapterNumber);

  if (!data) {
    return {};
  }

  return {
    title: `${data.book.title} - Chapter ${chapterNumber}`,
    description: data.description,
    alternates: {
      canonical: absoluteUrl(getBookChapterReaderUrl(data.level.id, data.book.slug, chapterNumber)),
    },
    openGraph: {
      title: `${data.book.title} · Chapter ${chapterNumber} | English Reader`,
      description: data.description,
      url: absoluteUrl(getBookChapterReaderUrl(data.level.id, data.book.slug, chapterNumber)),
      type: 'book',
      images: data.book.assetCoverImg ? [absoluteUrl(data.book.assetCoverImg)] : [],
    },
  };
}

export default async function BookChapterPage({ params }: Props) {
  const chapterNumber = Number(params.chapter);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
    notFound();
  }

  const data = await getBookChapterPageData(params.level, params.slug, chapterNumber);
  const level = getBookLevel(params.level);

  if (!data || !level) {
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
    url: absoluteUrl(getBookChapterReaderUrl(data.level.id, data.book.slug, chapterNumber)),
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
      id: data.chapter.id,
      content: data.chapter.content,
      chapterIndex: data.chapter.chapterIndex,
      chapterTitle: data.chapter.chapterTitle,
      readingTime: data.chapter.readingTime,
      wordCount: data.chapter.wordCount,
    },
  });

  return (
    <>
      <Script
        id={`book-schema-${data.book.slug}-${chapterNumber}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <BookReaderClient
        book={data.book}
        chapters={data.chapters}
        levelLabel={level.shortLabel}
        initialArticle={initialArticle}
        initialChapterNumber={chapterNumber}
      />
    </>
  );
}
