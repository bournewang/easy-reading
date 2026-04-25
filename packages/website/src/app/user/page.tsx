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


const getPlanStyles = (plan: string) => {
  if (plan === 'pro') {
    return {
      pill: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
      accent: 'border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.98)_0%,rgba(209,250,229,0.92)_52%,rgba(236,254,255,0.96)_100%)]',
      card: 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(240,253,250,0.94)_100%)]',
      mutedText: 'text-emerald-900/70',
      strongText: 'text-emerald-950',
      secondarySurface: 'border-emerald-200/80 bg-white/72',
      secondaryLabel: 'text-emerald-900/60',
    };
  }

  return {
    pill: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300',
    accent: 'border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_56%,rgba(241,245,249,0.98)_100%)]',
    card: 'border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)]',
    mutedText: 'text-slate-600',
    strongText: 'text-slate-950',
    secondarySurface: 'border border-slate-200/80 bg-white/80',
    secondaryLabel: 'text-slate-500',
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
  const { user, entitlements, loading, logout } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();
  const [articles, setArticles] = useState<ReadingHistoryItem[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSummary | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralSummary | null>(null);
  const [referralCopyState, setReferralCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [wordbookCount, setWordbookCount] = useState(0);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const { catalog: vocabularyBookCatalog, selectedBookIds } = useVocabularyBooks();

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

  const handleCopyReferralLink = async () => {
    if (!referralInfo?.referralLink || !navigator.clipboard) {
      setReferralCopyState('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(referralInfo.referralLink);
      setReferralCopyState('copied');
    } catch (error) {
      console.error('Failed to copy referral link:', error);
      setReferralCopyState('failed');
    }
  };

  useEffect(() => {
    if (referralCopyState === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => {
      setReferralCopyState('idle');
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [referralCopyState]);

  const subscriptionExpires = subscriptionInfo?.expiresAt
    ? new Date(subscriptionInfo.expiresAt)
    : user?.subscriptionExpires
      ? new Date(user.subscriptionExpires)
      : null;
  const isExpired = subscriptionExpires ? subscriptionExpires < new Date() : false;
  const currentPlanTier = user?.subscriptionTier?.toLowerCase() || 'free';
  const planStyles = getPlanStyles(currentPlanTier);
  const billingModeLabel = currentPlanTier === 'free'
    ? common('freePlan')
    : subscriptionInfo?.billingMode === 'recurring'
      ? userText('billingRecurring')
      : userText('billingPrepaid');
  const canManageRecurring = subscriptionInfo?.active && subscriptionInfo.billingMode === 'recurring';
  const planLabel = common(currentPlanTier === 'pro' ? 'proPlan' : 'freePlan');
  const membershipStateLabel = isExpired
    ? common('expired')
    : currentPlanTier === 'free'
      ? common('starterAccess')
      : common('active');
  const renewalDateLabel = subscriptionInfo?.active && !isExpired && subscriptionExpires
    ? subscriptionExpires.toLocaleDateString()
    : common('noRenewalScheduled');

  const selectedVocabularyBooks = useMemo(() => {
    return selectedBookIds
      .map((id) => vocabularyBookCatalog.find((book) => book.id === id))
      .filter((book): book is NonNullable<typeof book> => Boolean(book));
  }, [selectedBookIds, vocabularyBookCatalog]);

  const readingCounts = useMemo<ReadingCounts>(() => {
    return articles.reduce<ReadingCounts>(
      (counts, article) => {
        counts[article.kind] += 1;
        return counts;
      },
      { news: 0, book: 0, ielts: 0 },
    );
  }, [articles]);

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
        <section className="relative overflow-hidden rounded-[38px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.95)_50%,rgba(255,247,237,0.96)_100%)] shadow-[0_32px_110px_-56px_rgba(15,23,42,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.14),_transparent_28%)]" />
          <div className="relative px-6 py-7 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                    {userText('badge')}
                  </div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[3rem] lg:leading-[1.02]">
                    {formatMessage(userText('welcome'), { name: user.fullName || user.username })}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{userText('subtitle')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start">
                  <Link
                    href="/user/profile"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                  >
                    {userText('profileSettings')}
                  </Link>
                  {user.isAdmin === true ? (
                    <Link
                      href="/admin"
                      className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      {userText('adminPanel')}
                    </Link>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center self-start rounded-full bg-[#f97316] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
                  >
                    {userText('logout')}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="rounded-[28px] border border-slate-200/80 bg-white/78 px-5 py-5 backdrop-blur-sm shadow-[0_14px_36px_-28px_rgba(15,23,42,0.22)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                    <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Link
          href="/user/vocabulary-books"
          className="group flex items-center justify-between rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.92)_100%)] p-6 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur transition-shadow hover:shadow-[0_26px_80px_-38px_rgba(15,23,42,0.34)] xl:p-7"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{userText('vocabularyEyebrow')}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{userText('vocabularySetup')}</h2>
              {selectedVocabularyBooks.length > 0 ? (
                <div className="flex flex-end flex-wrap gap-2">
                  {selectedVocabularyBooks.map((book) => (
                    <span
                      key={book.id}
                      className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800"
                    >
                      {book.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">{userText('vocabularySetupDescription')}</p>
              )}
            </div>
          </div>
          <div className="ml-6 flex shrink-0 items-center gap-3">
            <svg className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l5 5-5 5" />
            </svg>
          </div>
        </Link>

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
                <div className="mt-2 flex items-start gap-3">
                  <p className="min-w-0 break-all text-sm leading-6 text-slate-700">{referralInfo?.referralLink || '-'}</p>
                  <button
                    type="button"
                    onClick={handleCopyReferralLink}
                    disabled={!referralInfo?.referralLink}
                    aria-label={userText('copyReferralLink')}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="7" y="3" width="10" height="12" rx="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7H4a2 2 0 00-2 2v7a2 2 0 002 2h8a2 2 0 002-2v-1" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500" role="status" aria-live="polite">
                  {referralCopyState === 'copied'
                    ? userText('referralLinkCopied')
                    : referralCopyState === 'failed'
                      ? userText('referralLinkCopyFailed')
                      : ''}
                </p>
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

              <div className="mt-4 flex justify-end">
                <Link
                  href="/user/referrals"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-200 transition-colors hover:bg-orange-50"
                >
                  {userText('viewReferralDetails')}
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
                  </svg>
                </Link>
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
                    <p className={`mt-4 text-sm ${planStyles.mutedText}`}>{userText('membershipStatus')}</p>
                    <p className={`mt-1 text-2xl font-semibold tracking-tight ${planStyles.strongText}`}>{membershipStateLabel}</p>
                  </div>
                  <div className={`rounded-[20px] px-4 py-3 text-right ${planStyles.secondarySurface}`}>
                    <p className={`text-xs uppercase tracking-[0.18em] ${planStyles.secondaryLabel}`}>{userText('billing')}</p>
                    <p className={`mt-2 text-sm font-semibold ${planStyles.strongText}`}>
                      {billingModeLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('renewalDate')}</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {renewalDateLabel}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('billing')}</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {billingModeLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {currentPlanTier === 'free' ? (
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
