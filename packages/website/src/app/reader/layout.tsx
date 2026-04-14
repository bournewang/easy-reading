import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Reader',
  description:
    'Read English content with translation, text-to-speech, and dictionary support.',
  path: '/reader',
  noIndex: true,
});

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
