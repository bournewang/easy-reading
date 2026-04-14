'use client';

import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

export default function LandingPageClient() {
  const { t } = useLocaleContext();
  const landing = (key: string) => t(`website.landingPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 py-24 text-white">
        <div className="absolute inset-0 bg-[url('/hero.jpg')] bg-cover bg-center opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="mb-6 text-6xl font-bold">{landing('heroTitle')}</h1>
          <p className="mb-8 text-xl">{landing('heroSubtitle')}</p>
          <div className="flex justify-center gap-4">
            <Link href="/news" className="rounded-lg bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-indigo-50">
              {common('readNow')}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16" id="features">
        <h2 className="mb-12 text-center text-3xl font-bold">{landing('featureTitle')}</h2>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 md:grid-cols-4">
          <div className="rounded-lg p-6 text-center shadow transition hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">{landing('featureTranslationTitle')}</h3>
            <p className="text-gray-600">{landing('featureTranslationBody')}</p>
          </div>
          <div className="rounded-lg p-6 text-center shadow transition hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">{landing('featureSpeechTitle')}</h3>
            <p className="text-gray-600">{landing('featureSpeechBody')}</p>
          </div>
          <div className="rounded-lg p-6 text-center shadow transition hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">{landing('featureWordBookTitle')}</h3>
            <p className="text-gray-600">{landing('featureWordBookBody')}</p>
          </div>
          <div className="rounded-lg p-6 text-center shadow transition hover:shadow-md">
            <h3 className="mb-2 text-lg font-semibold">{landing('featureLayoutTitle')}</h3>
            <p className="text-gray-600">{landing('featureLayoutBody')}</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="prose prose-lg prose-slate mx-auto max-w-4xl px-4">
          <h2>{landing('storyTitle')}</h2>
          <p>{landing('storyBodyOne')}</p>
          <p>{landing('storyBodyTwo')}</p>
        </div>
      </section>

      <section className="bg-indigo-700 px-4 py-20 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">{landing('ctaTitle')}</h2>
        <p className="mb-8 text-lg">{landing('ctaSubtitle')}</p>
        <Link href="/news" className="rounded-lg bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-indigo-50">
          {common('startReading')}
        </Link>
      </section>

      <section className="bg-gray-50 py-16" id="reviews">
        <h2 className="mb-12 text-center text-3xl font-bold">{landing('reviewsTitle')}</h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="mb-4 text-gray-700">{landing('reviewOne')}</p>
            <span className="font-semibold text-indigo-600">- Alice</span>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="mb-4 text-gray-700">{landing('reviewTwo')}</p>
            <span className="font-semibold text-indigo-600">- Ben</span>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="mb-4 text-gray-700">{landing('reviewThree')}</p>
            <span className="font-semibold text-indigo-600">- Chen</span>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-violet-600 to-indigo-600 py-20 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">{landing('finalCtaTitle')}</h2>
        <p className="mb-8 text-purple-100">{landing('finalCtaSubtitle')}</p>
        <Link href="/news" className="rounded-lg bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-purple-50">
          {common('readNow')}
        </Link>
      </section>
    </div>
  );
}
