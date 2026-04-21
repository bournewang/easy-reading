'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatMessage } from '@/lib/i18n';
import {
  cancelSubscription,
  getSubscriptionSummary,
  reactivateSubscription,
  type SubscriptionSummary,
} from '@/lib/api/subscription';
import { getReferralSummary, type ReferralSummary } from '@/lib/api/referral';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';
import { api } from '@/utils/api';
import { getReadingHistoryAsync, type ReadingHistoryItem } from '@/utils/reading-history';

type WordbookEntry = {
  word: string;
};

type ReadingCounts = {
  news: number;
  book: number;
  ielts: number;
};

type VocabularyGroupKey =
  | 'primary-school'
  | 'middle-school'
  | 'high-school'
  | 'cet4'
  | 'cet6'
  | 'ielts'
  | 'toefl'
  | 'gre'
  | 'sat'
  | 'gmat'
  | 'postgraduate'
  | 'tem4'
  | 'tem8'
  | 'bec'
  | 'other';

const VOCABULARY_GROUP_ORDER: VocabularyGroupKey[] = [
  'primary-school',
  'middle-school',
  'high-school',
  'cet4',
  'cet6',
  'ielts',
  'toefl',
  'gre',
  'sat',
  'gmat',
  'postgraduate',
  'tem4',
  'tem8',
  'bec',
  'other',
];

const VOCABULARY_GROUP_LABEL_KEYS: Record<VocabularyGroupKey, string> = {
  'primary-school': 'vocabularyGroupPrimarySchool',
  'middle-school': 'vocabularyGroupMiddleSchool',
  'high-school': 'vocabularyGroupHighSchool',
  cet4: 'vocabularyGroupCET4',
  cet6: 'vocabularyGroupCET6',
  ielts: 'vocabularyGroupIELTS',
  toefl: 'vocabularyGroupTOEFL',
  gre: 'vocabularyGroupGRE',
  sat: 'vocabularyGroupSAT',
  gmat: 'vocabularyGroupGMAT',
  postgraduate: 'vocabularyGroupPostgraduate',
  tem4: 'vocabularyGroupTEM4',
  tem8: 'vocabularyGroupTEM8',
  bec: 'vocabularyGroupBEC',
  other: 'vocabularyGroupOther',
};

const getPlanStyles = (plan: string) => {
  if (plan === 'pro') {
    return {
      pill: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
      accent: 'from-emerald-400 via-teal-400 to-cyan-500',
      card: 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(240,253,250,0.94)_100%)]',
    };
  }

  return {
    pill: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300',
    accent: 'from-slate-700 via-slate-800 to-slate-900',
    card: 'border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)]',
  };
};

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur xl:p-7 ${className}`}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function UserCenterPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();
  const [articles, setArticles] = useState<ReadingHistoryItem[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSummary | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralSummary | null>(null);
  const [wordbookCount, setWordbookCount] = useState(0);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [activeVocabularyGroup, setActiveVocabularyGroup] = useState<VocabularyGroupKey | null>(null);
  const {
    catalog: vocabularyBookCatalog,
    selectedBookIds,
    loadingCatalog: loadingVocabularyBookCatalog,
    savingSelection: savingVocabularyBookSelection,
    toggleBookSelection,
  } = useVocabularyBooks();

  const userText = (key: string) => t(`website.userPage.${key}`);
  const common = (key: string) => t(`website.common.${key}`);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadPageData = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError(null);

      const [historyResult, subscriptionResult, referralResult, wordbookResult] = await Promise.allSettled([
        getReadingHistoryAsync(),
        getSubscriptionSummary(),
        getReferralSummary(),
        api.get<WordbookEntry[]>('/wordbook'),
      ]);

      if (cancelled) {
        return;
      }

      if (historyResult.status === 'fulfilled') {
        setArticles(historyResult.value);
      } else {
        console.error('Failed to load reading history:', historyResult.reason);
      }

      if (subscriptionResult.status === 'fulfilled') {
        setSubscriptionInfo(subscriptionResult.value);
      } else {
        console.error('Failed to load subscription:', subscriptionResult.reason);
        setSubscriptionError(userText('subscriptionLoadError'));
      }

      if (referralResult.status === 'fulfilled') {
        setReferralInfo(referralResult.value);
      } else {
        console.error('Failed to load referral summary:', referralResult.reason);
      }

      if (wordbookResult.status === 'fulfilled') {
        setWordbookCount(wordbookResult.value.data.length);
      } else {
        console.error('Failed to load wordbook count:', wordbookResult.reason);
        setWordbookCount(0);
      }

      setSubscriptionLoading(false);
    };

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [user, t]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const subscriptionStatus = subscriptionInfo?.tier || user?.subscriptionTier || 'free';
  const subscriptionExpires = subscriptionInfo?.expiresAt
    ? new Date(subscriptionInfo.expiresAt)
    : user?.subscriptionExpires
      ? new Date(user.subscriptionExpires)
      : null;
  const isExpired = subscriptionExpires ? subscriptionExpires < new Date() : false;
  const planStyles = getPlanStyles(subscriptionStatus);
  const billingModeLabel =
    subscriptionInfo?.billingMode === 'recurring' ? userText('billingRecurring') : userText('billingPrepaid');
  const canManageRecurring = subscriptionInfo?.active && subscriptionInfo.billingMode === 'recurring';
  const planLabel = common(subscriptionStatus === 'pro' ? 'proPlan' : 'freePlan');
  const membershipStateLabel = isExpired
    ? common('expired')
    : subscriptionStatus === 'free'
      ? common('starterAccess')
      : common('active');

  const readingCounts = useMemo<ReadingCounts>(() => {
    return articles.reduce<ReadingCounts>(
      (counts, article) => {
        counts[article.kind] += 1;
        return counts;
      },
      { news: 0, book: 0, ielts: 0 },
    );
  }, [articles]);

  const selectedVocabularyCount = selectedBookIds.length;
  const selectedVocabularyBooks = useMemo(() => {
    return selectedBookIds
      .map((selectedId) => vocabularyBookCatalog.find((book) => book.id === selectedId))
      .filter((book): book is NonNullable<typeof book> => Boolean(book));
  }, [selectedBookIds, vocabularyBookCatalog]);

  const availableVocabularyGroups = useMemo(() => {
    const groups = new Set<VocabularyGroupKey>();

    vocabularyBookCatalog.forEach((book) => {
      const primaryGroup = (book.tags[0] as VocabularyGroupKey | undefined) || 'other';
      groups.add(primaryGroup);
    });

    return VOCABULARY_GROUP_ORDER.filter((group) => groups.has(group));
  }, [vocabularyBookCatalog]);

  useEffect(() => {
    if (availableVocabularyGroups.length === 0) {
      if (activeVocabularyGroup !== null) {
        setActiveVocabularyGroup(null);
      }
      return;
    }

    const selectedBookGroup = selectedBookIds
      .map((selectedId) => vocabularyBookCatalog.find((book) => book.id === selectedId)?.tags[0] as VocabularyGroupKey | undefined)
      .find((group): group is VocabularyGroupKey => Boolean(group && availableVocabularyGroups.includes(group)));

    const nextGroup =
      (activeVocabularyGroup && availableVocabularyGroups.includes(activeVocabularyGroup) ? activeVocabularyGroup : null) ||
      selectedBookGroup ||
      availableVocabularyGroups[0];

    if (nextGroup !== activeVocabularyGroup) {
      setActiveVocabularyGroup(nextGroup);
    }
  }, [activeVocabularyGroup, availableVocabularyGroups, selectedBookIds, vocabularyBookCatalog]);

  const filteredVocabularyBooks = useMemo(() => {
    if (!activeVocabularyGroup) {
      return vocabularyBookCatalog;
    }

    return vocabularyBookCatalog.filter((book) => ((book.tags[0] as VocabularyGroupKey | undefined) || 'other') === activeVocabularyGroup);
  }, [activeVocabularyGroup, vocabularyBookCatalog]);

  const stats = [
    { label: userText('statNewsReadCount'), value: readingCounts.news.toString() },
    { label: userText('statBookChaptersReadCount'), value: readingCounts.book.toString() },
    { label: userText('statIeltsPassagesReadCount'), value: readingCounts.ielts.toString() },
    { label: userText('statWordbookCount'), value: wordbookCount.toString() },
  ];

  const handleCancelSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      const summary = await cancelSubscription();
      setSubscriptionInfo(summary);
    } catch (error: any) {
      setSubscriptionError(error?.response?.data?.detail || error?.message || userText('cancelSubscriptionError'));
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      const summary = await reactivateSubscription();
      setSubscriptionInfo(summary);
    } catch (error: any) {
      setSubscriptionError(error?.response?.data?.detail || error?.message || userText('reactivateSubscriptionError'));
    } finally {
      setSubscriptionLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-64 rounded-[36px] bg-white shadow-sm" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-80 rounded-[30px] bg-white shadow-sm" />
            <div className="h-80 rounded-[30px] bg-white shadow-sm" />
          </div>
          <div className="h-[28rem] rounded-[30px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_28%),radial-gradient(circle_at_88%_14%,_rgba(251,146,60,0.18),_transparent_22%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef2f7_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[38px] bg-[#101828] text-white shadow-[0_32px_110px_-40px_rgba(15,23,42,0.72)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.25),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.22),_transparent_28%)]" />
          <div className="relative px-6 py-7 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                    {userText('badge')}
                  </div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3rem] lg:leading-[1.02]">
                    {formatMessage(userText('welcome'), { name: user.fullName || user.username })}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">{userText('subtitle')}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center self-start rounded-full bg-[#f97316] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
                >
                  {userText('logout')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="rounded-[28px] border border-white/12 bg-white/8 px-5 py-5 backdrop-blur-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">{stat.label}</p>
                    <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{stat.value}</p>
                    {/* <p className="mt-2 text-sm font-medium text-white/76">{stat.label}</p> */}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionCard
          eyebrow={userText('vocabularyEyebrow')}
          title={userText('vocabularyTitle')}
          description={userText('vocabularyDescription')}
          className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.92)_100%)]"
        >
          <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {userText('vocabularySelectedBooksLabel')}
                </p>
                {selectedVocabularyBooks.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedVocabularyBooks.map((book) => (
                      <span
                        key={book.id}
                        className="inline-flex max-w-full items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800"
                      >
                        <span className="truncate">{book.title}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">{userText('vocabularyNoSelection')}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {savingVocabularyBookSelection ? <p className="text-sm text-sky-600">{userText('vocabularySaving')}</p> : null}
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {formatMessage(userText('vocabularySelectedCount'), { count: selectedVocabularyCount })}
                </p>
              </div>
            </div>

            {availableVocabularyGroups.length > 0 ? (
              <div className="mb-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {userText('vocabularyCategoryLabel')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableVocabularyGroups.map((group) => {
                    const isActive = group === activeVocabularyGroup;

                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setActiveVocabularyGroup(group)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-950 text-white'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {userText(VOCABULARY_GROUP_LABEL_KEYS[group])}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="max-h-[620px] overflow-y-auto pr-1">
              {loadingVocabularyBookCatalog ? (
                <p className="text-sm text-slate-500">{userText('vocabularyLoading')}</p>
              ) : vocabularyBookCatalog.length === 0 ? (
                <p className="text-sm text-slate-500">{userText('vocabularyEmpty')}</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredVocabularyBooks.map((book) => {
                    const checked = selectedBookIds.includes(book.id);
                    const isAtLimit = selectedBookIds.length >= 3 && !checked;

                    return (
                      <button
                        key={book.id}
                        type="button"
                        disabled={savingVocabularyBookSelection || isAtLimit}
                        onClick={() => {
                          void toggleBookSelection(book.id);
                        }}
                        className={`flex min-h-[92px] w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-colors ${
                          checked
                            ? 'border-sky-300 bg-sky-50'
                            : isAtLimit
                              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        } ${savingVocabularyBookSelection ? 'opacity-60' : ''}`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            checked ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5 5 9l4.5-5" />
                          </svg>
                        </div>

                        {book.image ? (
                          <img src={book.image} alt={book.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{book.title}</p>
                            {checked ? (
                              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                {userText('vocabularyActive')}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{book.wordCount.toLocaleString()} words</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <SectionCard
            eyebrow={userText('referralTitle')}
            title={userText('referralTitle')}
            description={userText('referralSubtitle')}
            className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,247,237,0.92)_100%)]"
          >
            <div className="space-y-4">
              <div className="rounded-[24px] border border-orange-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('referralLink')}</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-700">{referralInfo?.referralLink || '-'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalReferrals')}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{referralInfo?.totalReferrals ?? 0}</p>
                </div>
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalCommission')}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">¥{(referralInfo?.totalCommission ?? 0).toFixed(2)}</p>
                </div>
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('pendingCommission')}</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">¥{(referralInfo?.pendingCommission ?? 0).toFixed(2)}</p>
                </div>
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('paidCommission')}</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">¥{(referralInfo?.paidCommission ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow={userText('currentPlan')}
            title={userText('currentPlan')}
            description={userText('actionManageBody')}
            className={planStyles.card}
          >
            <div className="space-y-4">
              <div className={`rounded-[26px] bg-gradient-to-br ${planStyles.accent} p-5 text-white`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${planStyles.pill}`}>
                      {planLabel}
                    </div>
                    <p className="mt-4 text-sm text-white/72">{userText('membershipStatus')}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{membershipStateLabel}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/58">{userText('billing')}</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {subscriptionInfo?.billingMode ? billingModeLabel : common('freePlan')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('renewalDate')}</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {subscriptionExpires ? subscriptionExpires.toLocaleDateString() : common('noRenewalScheduled')}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('billing')}</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {subscriptionInfo?.billingMode ? billingModeLabel : common('freePlan')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {subscriptionStatus === 'free' ? (
                  <Link
                    href="/pricing"
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    {userText('upgrade')}
                  </Link>
                ) : null}

                {canManageRecurring && !subscriptionInfo?.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={subscriptionLoading}
                    className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {userText('cancelAutoRenew')}
                  </button>
                ) : null}

                {canManageRecurring && subscriptionInfo?.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={subscriptionLoading}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {userText('reactivateAutoRenew')}
                  </button>
                ) : null}

                {subscriptionInfo && !subscriptionInfo.autoRenew ? (
                  <Link
                    href="/pricing"
                    className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                  >
                    {userText('renewOrChangePlan')}
                  </Link>
                ) : null}
              </div>

              {subscriptionInfo?.cancelAtPeriodEnd ? (
                <p className="text-sm text-amber-700">
                  {formatMessage(userText('autoRenewOff'), { date: subscriptionExpires?.toLocaleDateString() || '' })}
                </p>
              ) : null}

              {subscriptionError ? <p className="text-sm text-rose-600">{subscriptionError}</p> : null}
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
