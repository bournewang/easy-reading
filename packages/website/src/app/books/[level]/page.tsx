import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { BOOK_LEVELS, getBookLevel, getBooksForLevel } from '@/lib/books';

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
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/books" className="hover:text-blue-600">
            Books
          </Link>
          <span className="mx-2">/</span>
          <div className="flex flex-wrap items-center gap-2">
            {BOOK_LEVELS.map((level) => {
              const isActive = level.id === levelData.id;

              return (
                <Link
                  key={level.id}
                  href={`/books/${level.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {level.shortLabel}
                </Link>
              );
            })}
          </div>
        </nav>

        <header className="mb-10 max-w-3xl">
          {/* <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {levelData.shortLabel}
          </span> */}
          <h1 className="mt-4 text-4xl font-bold text-gray-900">{levelData.label}</h1>
          <p className="mt-4 text-lg text-gray-600">{levelData.description}</p>
          <p className="mt-3 text-sm text-gray-500">
            {levelData.total} books in this level. Read with translation, text-to-speech, and an integrated dictionary.
          </p>
        </header>

        {/* <div className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Who this level is for</h2>
          <p className="mt-3 text-gray-600">
            {levelData.shortLabel} books are useful when you want material that matches your current reading ability
            without losing access to translation and word support. Pick a title below to start reading immediately.
          </p>
        </div> */}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {levelData.books.map((book) => (
            <Link
              key={book.slug}
              href={`/books/${levelData.id}/${book.slug}`}
              className="group rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
                {book.assetCoverImg ? (
                  <img
                    src={book.assetCoverImg}
                    alt={`Cover of ${book.title}`}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">No cover</div>
                )}
              </div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-600">{levelData.shortLabel}</div>
              <h2 className="text-lg font-semibold text-gray-900">{book.title}</h2>
              <p className="mt-1 text-sm text-gray-600">by {book.author || 'Unknown author'}</p>
              <p className="mt-3 text-sm text-gray-500">{book.chapterCount} chapters</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
