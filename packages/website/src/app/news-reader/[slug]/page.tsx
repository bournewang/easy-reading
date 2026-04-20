import ReaderPageClient from '@/components/reader/ReaderPageClient';

type NewsReaderSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewsReaderSlugPage({ params }: NewsReaderSlugPageProps) {
  const { slug } = await params;

  return <ReaderPageClient initialBackPath="/news" initialNewsSlug={slug} />;
}