import Script from 'next/script';
import { absoluteUrl, createPageMetadata, siteConfig } from '@/lib/seo';
import { getAllBookLevels } from '@/lib/books';
import { BooksIndexPageClient } from '@/components/books/BooksIndexPageClient';

export const metadata = createPageMetadata({
  title: 'English Books Library',
  description:
    'Browse graded English books for learners and read them with built-in translation, dictionary, and text-to-speech support.',
  path: '/books',
  keywords: [
    'english books for learners',
    'graded readers',
    'english reading practice books',
    'esl books online',
  ],
});

export default async function BooksIndexPage() {
  const levels = await getAllBookLevels();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'English Books Library',
    url: absoluteUrl('/books'),
    description:
      'A library of English books for learners with in-context translation, text-to-speech, and dictionary support.',
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: absoluteUrl('/'),
    },
  };

  return (
    <>
      <Script
        id="books-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BooksIndexPageClient levels={levels} />
    </>
  );
}
