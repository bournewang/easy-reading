import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/news', '/books', '/pricing'],
        disallow: [
          '/articles',
          '/history',
          '/checkout',
          '/home',
          '/login',
          '/reader',
          '/register',
          '/subscription',
          '/user',
          '/wordlist',
        ],
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
