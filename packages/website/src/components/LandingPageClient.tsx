'use client';

import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';

export default function LandingPageClient() {
  const { t } = useLocaleContext();
  const landing = (key: string) => t(`website.landingPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);
  const nav = (key: string) => t(`website.navigation.${key}`);

  const readingModes = [
    { href: '/news', eyebrow: nav('news'), title: landing('modeNewsTitle'), body: landing('modeNewsBody') },
    { href: '/ielts', eyebrow: 'IELTS', title: landing('modeIeltsTitle'), body: landing('modeIeltsBody') },
    { href: '/books/b11', eyebrow: nav('books'), title: landing('modeBooksTitle'), body: landing('modeBooksBody') },
  ];

  const features = [
    {
      title: landing('featureTranslationTitle'),
      body: landing('featureTranslationBody'),
    },
    {
      title: landing('featureSpeechTitle'),
      body: landing('featureSpeechBody'),
    },
    {
      title: landing('featureWordBookTitle'),
      body: landing('featureWordBookBody'),
    },
    {
      title: landing('featureLayoutTitle'),
      body: landing('featureLayoutBody'),
    },
  ];

  const upgradeReasons = [
    {
      title: landing('upgradeReasonOneTitle'),
      body: landing('upgradeReasonOneBody'),
    },
    {
      title: landing('upgradeReasonTwoTitle'),
      body: landing('upgradeReasonTwoBody'),
    },
    {
      title: landing('upgradeReasonThreeTitle'),
      body: landing('upgradeReasonThreeBody'),
    },
  ];

  const outcomes = [
    {
      title: landing('resultOneTitle'),
      body: landing('resultOneBody'),
    },
    {
      title: landing('resultTwoTitle'),
      body: landing('resultTwoBody'),
    },
    {
      title: landing('resultThreeTitle'),
      body: landing('resultThreeBody'),
    },
  ];

  const steps = [
    {
      number: '01',
      title: landing('stepOneTitle'),
      body: landing('stepOneBody'),
    },
    {
      number: '02',
      title: landing('stepTwoTitle'),
      body: landing('stepTwoBody'),
    },
    {
      number: '03',
      title: landing('stepThreeTitle'),
      body: landing('stepThreeBody'),
    },
  ];

  const comparisonRows = [
    {
      label: landing('comparisonTranslationLabel'),
      free: landing('comparisonFreeLimited'),
      pro: landing('comparisonProUnlimited'),
    },
    {
      label: landing('comparisonTtsLabel'),
      free: landing('comparisonFreeBasic'),
      pro: landing('comparisonProFull'),
    },
    {
      label: landing('comparisonWordbookLabel'),
      free: landing('comparisonFreeBasic'),
      pro: landing('comparisonProAdvanced'),
    },
    {
      label: landing('comparisonFocusLabel'),
      free: landing('comparisonFreeGood'),
      pro: landing('comparisonProBest'),
    },
  ];

  const faqs = [
    {
      question: landing('faqOneQuestion'),
      answer: landing('faqOneAnswer'),
    },
    {
      question: landing('faqTwoQuestion'),
      answer: landing('faqTwoAnswer'),
    },
    {
      question: landing('faqThreeQuestion'),
      answer: landing('faqThreeAnswer'),
    },
  ];

  return (
    <div className="er-page">
      <section className="er-section er-section-hero">
        <div className="er-shell">
          <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-4xl">
              <p className="er-kicker mb-5 text-[#0071e3]">English Reader</p>
              <h1 className="er-display max-w-4xl">{landing('heroTitle')}</h1>
              <p className="er-body er-body-muted mt-6 max-w-2xl">
                {landing('heroSubtitle')}
              </p>
              <p className="mt-4 max-w-2xl text-[15px] tracking-[-0.02em] text-[#1d1d1f]/64">
                {landing('heroSupport')}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/pricing" className="er-button er-button-primary">
                  {landing('heroPrimaryCta')}
                </Link>
                <Link href="/news" className="er-button er-button-secondary er-button-secondary-light">
                  {landing('heroSecondaryCta')}
                </Link>
              </div>
              <p className="mt-4 text-sm tracking-[-0.02em] text-[#1d1d1f]/54">
                {landing('heroMicrocopy')}
              </p>
            </div>

            <div className="mx-auto w-full max-w-[480px] lg:ml-auto">
              <div className="grid gap-4">
                <div className="er-panel-soft er-panel-highlight rounded-[36px] p-6 sm:p-7">
                  <p className="text-sm font-medium tracking-[-0.02em] text-[#2997ff]">
                    {landing('heroHighlightsTitle')}
                  </p>
                  <h3 className="mt-4 font-[var(--font-display)] text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#1d1d1f]">
                    {landing('heroHighlightsHeading')}
                  </h3>
                  <p className="mt-4 text-[15px] leading-7 tracking-[-0.02em] text-[#1d1d1f]/72">
                    {landing('heroHighlightsBody')}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {[nav('news'), 'IELTS', nav('books'), nav('history')].map((label) => (
                      <div
                        key={label}
                        className="er-pill-soft rounded-full px-4 py-2 text-sm tracking-[-0.02em]"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="er-card-feature rounded-[28px] p-5 text-[#1d1d1f]">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[#0071e3]">
                      IELTS
                    </p>
                    <p className="mt-3 font-[var(--font-display)] text-[24px] font-semibold leading-[1.08] tracking-[-0.04em]">
                      {landing('heroIeltsTitle')}
                    </p>
                    <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-[#1d1d1f]/68">
                      {landing('heroIeltsBody')}
                    </p>
                  </div>

                  <div className="er-card-feature rounded-[28px] p-5 text-[#1d1d1f]">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[#0071e3]">
                      {nav('books')}
                    </p>
                    <p className="mt-3 font-[var(--font-display)] text-[24px] font-semibold leading-[1.08] tracking-[-0.04em]">
                      {landing('heroBooksTitle')}
                    </p>
                    <p className="mt-3 text-sm leading-6 tracking-[-0.02em] text-[#1d1d1f]/68">
                      {landing('heroBooksBody')}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="er-section er-section-white">
        <div className="er-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="er-kicker text-[#0071e3]">{landing('upgradeTitle')}</p>
            <h2 className="er-headline mt-4">{landing('upgradeHeading')}</h2>
            <p className="er-body er-body-muted mt-5">{landing('upgradeBody')}</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {upgradeReasons.map((item) => (
              <div key={item.title} className="er-card">
                <h3 className="er-subhead">{item.title}</h3>
                <p className="er-body er-body-muted mt-4">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-light">
        <div className="er-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="er-kicker text-[#0071e3]">{landing('featureTitle')}</p>
            <h2 className="er-headline mt-4">{landing('featureIntroTitle')}</h2>
            <p className="er-body er-body-muted mt-5">
              {landing('featureIntroBody')}
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="er-card min-h-[240px]">
                <div className="mb-8 h-1.5 w-14 rounded-full bg-[#0071e3]" />
                <h3 className="er-subhead">{feature.title}</h3>
                <p className="er-body er-body-muted mt-4">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-light">
        <div className="er-shell">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="er-kicker text-[#0071e3]">{landing('comparisonTitle')}</p>
              <h2 className="er-headline mt-4 max-w-xl">{landing('comparisonHeading')}</h2>
              <p className="er-body er-body-muted mt-5 max-w-xl">
                {landing('comparisonBody')}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/pricing" className="er-button er-button-primary">
                  {nav('pricing')}
                </Link>
                <Link href="/register" className="er-button er-button-secondary er-button-secondary-light">
                  {nav('register')}
                </Link>
              </div>
            </div>

            <div className="er-panel-soft overflow-hidden rounded-[32px]">
              <div className="grid grid-cols-[1.1fr_0.75fr_0.75fr] border-b border-black/5 bg-white/60 px-6 py-4 text-sm font-medium tracking-[-0.02em] text-[#1d1d1f]/70">
                <div>{landing('comparisonColumnFeature')}</div>
                <div className="text-center">{landing('comparisonColumnFree')}</div>
                <div className="text-center text-[#0071e3]">{landing('comparisonColumnPro')}</div>
              </div>
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.1fr_0.75fr_0.75fr] items-center border-b border-black/5 px-6 py-5 last:border-b-0"
                >
                  <div className="pr-4 text-[15px] font-medium tracking-[-0.02em] text-[#1d1d1f]">
                    {row.label}
                  </div>
                  <div className="text-center text-sm tracking-[-0.02em] text-[#1d1d1f]/62">{row.free}</div>
                  <div className="text-center text-sm font-medium tracking-[-0.02em] text-[#2997ff]">{row.pro}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="er-section er-section-white">
        <div className="er-shell">
          <div className="grid gap-6 lg:grid-cols-3">
            {readingModes.map((mode) => (
              <div key={mode.href} className="er-card border border-black/5 bg-white">
                <p className="er-kicker text-[#0071e3]">
                  {mode.eyebrow}
                </p>
                <h3 className="er-subhead mt-4">{mode.title}</h3>
                <p className="er-body er-body-muted mt-4">{mode.body}</p>
                <Link href={mode.href} className="mt-8 inline-flex text-[15px] font-medium text-[#0066cc] hover:underline">
                  {common('startReading')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-light">
        <div className="er-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="er-kicker text-[#0071e3]">{landing('stepsTitle')}</p>
            <h2 className="er-headline mt-4">{landing('stepsHeading')}</h2>
            <p className="er-body er-body-muted mt-5">{landing('stepsBody')}</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="er-card">
                <p className="text-sm font-semibold tracking-[0.08em] text-[#0071e3]">{step.number}</p>
                <h3 className="er-subhead mt-6">{step.title}</h3>
                <p className="er-body er-body-muted mt-4">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-white">
        <div className="er-shell grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="er-kicker text-[#0071e3]">{landing('storyTitle')}</p>
            <h2 className="er-headline mt-4 max-w-xl">
              {landing('storyPanelTitle')}
            </h2>
          </div>
          <div className="er-panel-soft er-panel-story space-y-6 rounded-[32px] p-8 sm:p-10">
            <p className="er-body er-body-muted">{landing('storyBodyOne')}</p>
            <p className="er-body er-body-muted">{landing('storyBodyTwo')}</p>
          </div>
        </div>
      </section>

      <section className="er-section er-section-white">
        <div className="er-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="er-kicker text-[#0071e3]">{landing('faqTitle')}</p>
            <h2 className="er-headline mt-4">{landing('faqHeading')}</h2>
            <p className="er-body er-body-muted mt-5">{landing('faqBody')}</p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4">
            {faqs.map((item) => (
              <div key={item.question} className="er-card border border-black/5 bg-white">
                <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{item.question}</h3>
                <p className="er-body er-body-muted mt-3">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-light">
        <div className="er-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="er-kicker text-[#0071e3]">{landing('resultsTitle')}</p>
            <h2 className="er-headline mt-4">{landing('resultsHeading')}</h2>
            <p className="er-body er-body-muted mt-5">{landing('resultsBody')}</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {outcomes.map((outcome) => (
              <div key={outcome.title} className="er-card">
                <div className="mb-8 h-1.5 w-14 rounded-full bg-[#0071e3]" />
                <h3 className="er-subhead">{outcome.title}</h3>
                <p className="er-body er-body-muted mt-4">{outcome.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="er-section er-section-white er-divider-top">
        <div className="er-shell text-center">
          <p className="er-kicker text-[#0071e3]">{landing('finalCtaTitle')}</p>
          <h2 className="er-headline mt-4">{landing('finalCtaHeading')}</h2>
          <p className="er-body er-body-muted mx-auto mt-5 max-w-2xl">
            {landing('finalCtaSubtitle')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/pricing" className="er-button er-button-primary">
              {landing('heroPrimaryCta')}
            </Link>
            <Link href="/register" className="er-button er-button-secondary er-button-secondary-light">
              {nav('register')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
