import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Word List',
  description: 'Personal saved vocabulary for English Reader users.',
  path: '/wordlist',
  noIndex: true,
});

export default function WordListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
