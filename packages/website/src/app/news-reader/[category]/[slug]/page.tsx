import ReaderPageClient from '@/components/reader/ReaderPageClient';

type NewsListItem = {
  id: string;
  category: string;
};

type NewsListResponse = {
  items?: NewsListItem[];
  totalPages?: number;
};

type NewsReaderCategorySlugPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export const dynamicParams = false;
export const dynamic = 'force-static';

function getNewsApiBaseUrl() {
  const configuredApiUrl =
    process.env.BACKEND_API_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  return configuredApiUrl ? `${configuredApiUrl}/api` : null;
}

async function fetchNewsPage(apiBaseUrl: string, page: number): Promise<NewsListResponse> {
  const response = await fetch(`${apiBaseUrl}/news?page=${page}&pageSize=100`, {
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch news list page ${page}: ${response.status}`);
  }

  return (await response.json()) as NewsListResponse;
}

export async function generateStaticParams() {
  const apiBaseUrl = getNewsApiBaseUrl();
  if (!apiBaseUrl) {
    console.warn('Skipping news-reader static params: missing BACKEND_API_BASE_URL or NEXT_PUBLIC_API_URL.');
    return [];
  }

  try {
    const firstPage = await fetchNewsPage(apiBaseUrl, 1);
    const totalPages = Math.max(1, firstPage.totalPages || 0);
    const items = [...(firstPage.items || [])];

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await fetchNewsPage(apiBaseUrl, page);
      items.push(...(nextPage.items || []));
    }

    return items
      .map((item) => ({
        category: item.category?.trim(),
        slug: item.id?.trim(),
      }))
      .filter(
        (item): item is { category: string; slug: string } => Boolean(item.category) && Boolean(item.slug),
      );
  } catch (error) {
    console.warn('Skipping news-reader static params because the news list could not be fetched.', error);
    return [];
  }
}

export default async function NewsReaderCategorySlugPage({ params }: NewsReaderCategorySlugPageProps) {
  const { category, slug } = await params;

  return <ReaderPageClient initialBackPath="/news" initialNewsSlug={slug} initialCategory={category} />;
}
