import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'User Center',
  description: 'Account area for English Reader users.',
  path: '/user',
  noIndex: true,
});

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
