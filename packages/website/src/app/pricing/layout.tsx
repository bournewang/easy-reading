import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Pricing',
  description:
    'Compare English Reader plans and choose the right option for translation, text-to-speech, and vocabulary learning.',
  path: '/pricing',
  keywords: ['english reader pricing', 'english learning app pricing'],
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
