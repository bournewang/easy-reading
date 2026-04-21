'use client';

import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { formatMessage } from '@/lib/i18n';

type LevelData = {
  id: string;
  shortLabel: string;
  label: string;
  description: string;
  total: number;
  books: Array<{
    slug: string;
    title: string;
    author: string;
    chapterCount: number;
    assetCoverImg: string | null;
    firstChapterNumber: number | null;
  }>;
};

type LevelTab = {
  id: string;
  shortLabel: string;
};

const levelAudienceProfiles = {
  a1: {
    en: {
      title: 'First full stories in English',
      body: 'Short chapters, high-frequency words, and very light sentence patterns for readers building their first real reading habit.',
    },
    zh: {
      title: '适合开始读第一批英文故事',
      body: '章节更短、词汇更常见、句型更轻，让刚开始做完整英文阅读的读者更容易进入状态。',
    },
  },
  a2: {
    en: {
      title: 'Comfortable step after beginner texts',
      body: 'Familiar daily language with enough story momentum to stretch vocabulary without making reading feel heavy.',
    },
    zh: {
      title: '适合从入门读物往前走一步',
      body: '以熟悉的日常表达为主，同时加入更多故事推进感，帮助你扩展词汇又不至于读得太吃力。',
    },
  },
  b11: {
    en: {
      title: 'Bridge into longer reading sessions',
      body: 'A strong fit for readers leaving easy passages behind and getting used to longer chapters with manageable new words.',
    },
    zh: {
      title: '适合过渡到更长的阅读时长',
      body: '很适合正在离开简单短文、开始接触更长章节的读者，新词量可控，适合建立持续阅读节奏。',
    },
  },
  b12: {
    en: {
      title: 'Intermediate stories with fuller flow',
      body: 'Better for readers who want richer plots, steadier chapter reading, and more natural sentence rhythm across each session.',
    },
    zh: {
      title: '适合进入更完整的中级阅读体验',
      body: '更适合希望读到更完整情节、更自然句式和更稳定章节推进感的中级读者。',
    },
  },
  b21: {
    en: {
      title: 'Independent reading with more depth',
      body: 'Designed for readers who can keep moving on their own and want more descriptive language, nuance, and denser scenes.',
    },
    zh: {
      title: '适合开始更独立、更有深度地阅读',
      body: '面向已经能相对独立读下去的读者，内容会有更多描写、更细的表达和更密集的场景信息。',
    },
  },
  b22: {
    en: {
      title: 'Near-authentic chapter practice',
      body: 'Useful when you want smoother comprehension over longer chapters and reading that feels close to real-world books.',
    },
    zh: {
      title: '适合接近真实书籍的章节练习',
      body: '如果你想在更长章节里保持更顺的理解，并逐步接近真实英文书籍的阅读体验，这一级会更合适。',
    },
  },
  c1: {
    en: {
      title: 'Advanced reading with nuance and challenge',
      body: 'Best for confident readers who want layered vocabulary, mature themes, and sentence structures that demand fuller attention.',
    },
    zh: {
      title: '适合追求细腻表达与挑战的高级读者',
      body: '适合已经很有把握的读者，想继续阅读更细腻的词汇、更成熟的主题，以及更需要专注理解的复杂句式。',
    },
  },
} as const;

const localizedLevelCopy = {
  a1: {
    en: {
      label: 'A1 English Books',
      description:
        'Best for complete beginners who know basic everyday words and want very short, simple stories to build reading confidence.',
    },
    zh: {
      label: 'A1 英语分级图书',
      description: '适合刚起步的读者，已经认识基础日常词汇，希望通过很短、很简单的故事建立英文阅读信心。',
    },
  },
  a2: {
    en: {
      label: 'A2 English Books',
      description:
        'Best for early learners who can handle familiar sentences and want easy stories that grow everyday vocabulary and fluency.',
    },
    zh: {
      label: 'A2 英语分级图书',
      description: '适合已经能读懂熟悉句子的初级学习者，希望通过更轻松的故事扩展日常词汇并提升流畅度。',
    },
  },
  b11: {
    en: {
      label: 'B1.1 English Books',
      description:
        'Best for lower-intermediate readers who are moving beyond easy texts and want longer stories with manageable new vocabulary.',
    },
    zh: {
      label: 'B1.1 英语分级图书',
      description: '适合刚进入中级阶段的读者，准备走出简单短文，开始阅读更长、但新词量仍然可控的故事。',
    },
  },
  b12: {
    en: {
      label: 'B1.2 English Books',
      description:
        'Best for solid intermediate learners who want richer plots, more natural sentence patterns, and broader day-to-day vocabulary.',
    },
    zh: {
      label: 'B1.2 英语分级图书',
      description: '适合基础更稳的中级学习者，希望读到更完整的情节、更自然的句式，以及更广的日常词汇。',
    },
  },
  b21: {
    en: {
      label: 'B2.1 English Books',
      description:
        'Best for upper-intermediate readers who can read independently and want deeper narratives with more descriptive and abstract language.',
    },
    zh: {
      label: 'B2.1 英语分级图书',
      description: '适合能够较独立阅读的中高级读者，希望接触更有层次的叙事，以及更多描写性和抽象表达。',
    },
  },
  b22: {
    en: {
      label: 'B2.2 English Books',
      description:
        'Best for strong upper-intermediate learners who want near-authentic reading practice and smoother comprehension across longer chapters.',
    },
    zh: {
      label: 'B2.2 英语分级图书',
      description: '适合基础扎实的中高级学习者，希望进行接近真实文本的阅读练习，并在更长章节中保持更顺畅的理解。',
    },
  },
  c1: {
    en: {
      label: 'C1 English Books',
      description:
        'Best for advanced readers who want challenging, authentic-style books with nuanced vocabulary, complex structure, and mature themes.',
    },
    zh: {
      label: 'C1 英语分级图书',
      description: '适合高级读者，希望阅读更具挑战、接近原版风格的作品，接触更细腻的词汇、更复杂的结构和更成熟的主题。',
    },
  },
} as const;

function getLevelAudienceProfile(levelId: string, locale: 'en' | 'zh', fallbackDescription: string) {
  const profile = levelAudienceProfiles[levelId as keyof typeof levelAudienceProfiles]?.[locale];

  if (profile) {
    return profile;
  }

  return {
    title: fallbackDescription,
    body: fallbackDescription,
  };
}

function getLocalizedLevelCopy(
  levelId: string,
  locale: 'en' | 'zh',
  fallback: { label: string; description: string },
) {
  return localizedLevelCopy[levelId as keyof typeof localizedLevelCopy]?.[locale] ?? fallback;
}

export function BookLevelPageClient({ levelData, levels }: { levelData: LevelData; levels: LevelTab[] }) {
  const { locale, t } = useLocaleContext();
  const levelText = (key: string) => t(`website.bookLevelPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);
  const currentLocale = locale === 'zh' ? 'zh' : 'en';
  const heroCopy = getLocalizedLevelCopy(levelData.id, currentLocale, {
    label: levelData.label,
    description: levelData.description,
  });

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.12),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] py-6 sm:py-8">
      <div className="w-full">
        {/* <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/books" className="font-medium hover:text-blue-600">
            {common('books')}
          </Link>
          <span>/</span>
          <span className="text-slate-700">{levelData.shortLabel}</span>
        </nav> */}

        <section className="overflow-hidden rounded-[34px] border border-white/60 bg-white/80 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="grid gap-5 border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-6 text-white sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1.35fr)_220px] lg:items-end lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100 ring-1 ring-white/15">
                {formatMessage(levelText('collection'), { level: levelData.shortLabel })}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{heroCopy.label}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{heroCopy.description}</p>
              <p className="mt-3 text-sm text-slate-300">
                {formatMessage(levelText('levelSummary'), { count: levelData.total })}
              </p>
            </div>

            <div>
              <div className="rounded-[24px] bg-indigo-100/15 p-3.5 ring-1 ring-indigo-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">{levelText('bookCount')}</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{levelData.total}</p>
              </div>
            </div>
          </div>

          
        </section>

          <div className="px-5 py-4 sm:px-6 sm:py-5 lg:px-8 bg-white/80 mt-6 border-x border-b border-white/60 rounded-[34px] shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => {
                const isActive = level.id === levelData.id;

                return (
                  <Link
                    key={level.id}
                    href={`/books/${level.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {level.shortLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {levelData.books.map((book) => (
            <div
              key={book.slug}
              className="group relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.96)_100%)] p-4 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_30px_90px_-40px_rgba(14,116,144,0.35)]"
            >
              <div className="pointer-events-none absolute inset-x-5 top-0 h-24 rounded-b-[28px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <Link
                href={`/books/${levelData.id}/${book.slug}/${book.firstChapterNumber ?? 1}`}
                className="block flex-1"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70">
                  {book.assetCoverImg ? (
                    <img
                      src={book.assetCoverImg}
                      alt={`Cover of ${book.title}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-400">
                      {common('noCover')}
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/25 via-slate-900/5 to-transparent opacity-80" />
                </div>

                <h2 className="mt-4 line-clamp-2 text-xl font-semibold leading-7 tracking-tight text-slate-950 transition-colors group-hover:text-sky-800">
                  {book.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {formatMessage(levelText('byAuthor'), { author: book.author || common('unknownAuthor') })}
                  <span className="mx-2 text-slate-300">•</span>
                  <span>{book.chapterCount} {common('chapter_other')}</span>
                </p>
              </Link>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
