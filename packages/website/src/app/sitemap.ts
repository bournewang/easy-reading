import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { getAllBooks, BOOK_LEVELS } from '@/lib/books';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const books = await getAllBooks();

  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/news'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/books'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...BOOK_LEVELS.map((level) => ({
      url: absoluteUrl(`/books/${level.id}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...books.map((book) => ({
      url: absoluteUrl(`/books/${book.level}/${book.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl('/pricing'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
