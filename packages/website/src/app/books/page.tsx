import Script from 'next/script';
import Link from 'next/link';
import { absoluteUrl, createPageMetadata, siteConfig } from '@/lib/seo';
import { getAllBookLevels } from '@/lib/books';

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
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <header className="mb-12 max-w-4xl">
            <h1 className="text-4xl font-bold text-gray-900">English Books Library</h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Browse English books by reading level and pick material that matches your vocabulary range. Each book can
              be read with translation, dictionary lookup, and text-to-speech support inside English Reader.
            </p>
          </header>

          <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Choose books by level</h2>
            <p className="mt-3 text-gray-600">
              Start with simpler graded readers at A1 or A2, then move to longer and more complex books in the B and C
              levels as your reading confidence improves.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {levels.map((level) => (
              <section key={level.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {level.shortLabel}
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  <Link href={`/books/${level.id}`} className="hover:text-blue-600">
                    {level.label}
                  </Link>
                </h2>
                <p className="mt-3 text-gray-600">{level.description}</p>
                <p className="mt-4 text-sm text-gray-500">{level.total} books available</p>

                <div className="mt-6 space-y-3">
                  {level.books.slice(0, 3).map((book) => (
                    <Link
                      key={book.slug}
                      href={`/books/${level.id}/${book.slug}`}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{book.title}</h3>
                        <p className="text-sm text-gray-500">{book.author || 'Unknown author'}</p>
                      </div>
                      <span className="text-sm text-blue-600">{book.chapterCount} ch.</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/books/${level.id}`}
                  className="mt-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Explore all {level.shortLabel} books
                </Link>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
