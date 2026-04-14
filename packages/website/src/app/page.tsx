import Script from 'next/script';
import { absoluteUrl, createPageMetadata, siteConfig } from '@/lib/seo';
import LandingPageClient from '@/components/LandingPageClient';

export const metadata = createPageMetadata({
  title: 'English Reader for Non-Native Speakers',
  description:
    'Read English with instant translation, text-to-speech, and a built-in dictionary. English Reader helps multilingual learners understand articles and books in one place.',
  path: '/',
  keywords: [
    'english reader',
    'english reading app',
    'read english with translation',
    'english reader for esl',
    'english learning with tts',
    'dictionary while reading',
  ],
});

export default function LandingPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: siteConfig.name,
        url: absoluteUrl('/'),
        description: siteConfig.description,
      },
      {
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        url: absoluteUrl('/'),
        description: siteConfig.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Instant translation while reading',
          'Text-to-speech for English articles',
          'Built-in dictionary for unfamiliar words',
          'Vocabulary saving and review',
          'Distraction-free reading interface',
        ],
      },
    ],
  };

  return (
    <div className="flex flex-col">
      <Script
        id="home-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPageClient />
    </div>
  );
}
