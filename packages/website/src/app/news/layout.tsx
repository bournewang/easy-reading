import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'English News Reader',
  description:
    'Practice English with curated news articles and read them using translation, text-to-speech, and dictionary tools.',
  path: '/news',
  keywords: [
    'english news for learners',
    'news reader with translation',
    'esl news reading',
    'english reading practice news',
  ],
});

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
