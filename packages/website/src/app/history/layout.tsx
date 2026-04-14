import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Reading History',
  description: 'Personal reading history for English Reader users.',
  path: '/history',
  noIndex: true,
});

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
