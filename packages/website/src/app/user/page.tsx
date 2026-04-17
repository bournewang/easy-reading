'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { formatMessage } from '@/lib/i18n';
import { getReadingHistory, type ReadingHistoryItem } from '@/utils/reading-history';
import {
  cancelSubscription,
  getSubscriptionSummary,
  reactivateSubscription,
  type SubscriptionSummary,
} from '@/lib/api/subscription';
import { getReferralSummary, type ReferralSummary } from '@/lib/api/referral';

type ActivityStat = {
  label: string;
  value: string;
  hint: string;
};

const getPlanStyles = (plan: string) => {
  switch (plan) {
    case 'pro':
      return {
        pill: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
        panel: 'from-sky-500 via-cyan-500 to-blue-600',
      };
    default:
      return {
        pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        panel: 'from-slate-800 via-slate-700 to-slate-900',
      };
  }
};

const getLearningStreak = (articles: ReadingHistoryItem[]) => {
  const uniqueDays = new Set(
    articles
      .filter((article) => article.timestamp)
      .map((article) => new Date(article.timestamp).toDateString())
  );

  const today = new Date();
  let streak = 0;

  while (uniqueDays.has(today.toDateString())) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  return streak;
};

const ActionIcon = ({ type }: { type: 'book' | 'history' | 'voice' | 'plan' }) => {
  const iconClassName = 'h-5 w-5';

  if (type === 'history') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.708" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v3h3" />
      </svg>
    );
  }

  if (type === 'voice') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a3 3 0 0 1 3 3v5a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 0 1-14 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
      </svg>
    );
  }

  if (type === 'plan') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 17h8" />
      </svg>
    );
  }

  return (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19.25A2.25 2.25 0 0 1 7.25 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.75A2.25 2.25 0 0 1 7.25 7H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.75v14.5" />
    </svg>
  );
};

export default function UserCenterPage() {
  const { user, entitlements, logout, loading } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();
  const [articles, setArticles] = useState<ReadingHistoryItem[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSummary | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralSummary | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
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

    setArticles(getReadingHistory());
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadSubscription = async () => {
      try {
        setSubscriptionLoading(true);
        setSubscriptionError(null);
        const summary = await getSubscriptionSummary();
        setSubscriptionInfo(summary);
      } catch (error) {
        console.error('Failed to load subscription:', error);
        setSubscriptionError('Unable to load subscription details right now.');
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadReferral = async () => {
      try {
        const summary = await getReferralSummary();
        setReferralInfo(summary);
      } catch (error) {
        console.error('Failed to load referral summary:', error);
      }
    };

    loadReferral();
  }, [user]);

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
  const billingModeLabel = subscriptionInfo?.billingMode === 'recurring' ? 'Recurring' : 'Prepaid';
  const canManageRecurring = subscriptionInfo?.active && subscriptionInfo.billingMode === 'recurring';

  const handleCancelSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      const summary = await cancelSubscription();
      setSubscriptionInfo(summary);
    } catch (error: any) {
      setSubscriptionError(error?.response?.data?.detail || error?.message || 'Unable to cancel subscription.');
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
      setSubscriptionError(error?.response?.data?.detail || error?.message || 'Unable to reactivate subscription.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const totalReadingMinutes = useMemo(
    () => articles.reduce((sum, article) => sum + (article.readingTime || 0), 0),
    [articles]
  );

  const totalWordsRead = useMemo(
    () => articles.reduce((sum, article) => sum + (article.wordCount || 0), 0),
    [articles]
  );

  const recentArticles = articles.slice(0, 3);
  const learningStreak = useMemo(() => getLearningStreak(articles), [articles]);

  const stats: ActivityStat[] = [
    {
      label: userText('statArticles'),
      value: articles.length.toString(),
      hint: userText('statArticlesHint'),
    },
    {
      label: userText('statReadingTime'),
      value: `${totalReadingMinutes} ${common('minute_other')}`,
      hint: userText('statReadingTimeHint'),
    },
    {
      label: userText('statWords'),
      value: totalWordsRead.toLocaleString(),
      hint: userText('statWordsHint'),
    },
    {
      label: userText('statStreak'),
      value: `${learningStreak} ${common(learningStreak === 1 ? 'day_one' : 'day_other')}`,
      hint: userText('statStreakHint'),
    },
  ];

  const actions = [
    {
      title: userText('actionVocabularyTitle'),
      description: userText('actionVocabularyBody'),
      href: '/wordlist',
      type: 'book' as const,
    },
    {
      title: userText('actionHistoryTitle'),
      description: userText('actionHistoryBody'),
      href: '/history',
      type: 'history' as const,
    },
    {
      title: userText('actionSpeechTitle'),
      description: userText('actionSpeechBody'),
      href: '/ielts',
      type: 'voice' as const,
    },
    {
      title: subscriptionStatus === 'free' ? userText('actionPlansTitle') : userText('actionManageTitle'),
      description: subscriptionStatus === 'free' ? userText('actionPlansBody') : userText('actionManageBody'),
      href: '/pricing',
      type: 'plan' as const,
    },
  ];

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-48 rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-3xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="h-80 rounded-3xl bg-white shadow-sm" />
            <div className="h-80 rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${planStyles.panel} text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.7)]`}>
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.4fr_0.8fr] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/15">
                {userText('badge')}
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatMessage(userText('welcome'), { name: user.fullName || user.username })}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                {userText('subtitle')}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/wordlist"
                  className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {userText('openWordBook')}
                </Link>
                <Link
                  href="/history"
                  className="inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
                >
                  {userText('readingHistory')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full bg-black/15 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-black/25"
                >
                  {userText('logout')}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/12 p-5 backdrop-blur-sm ring-1 ring-white/15">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/75">{userText('currentPlan')}</p>
                  <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${planStyles.pill}`}>
                    {common(`${subscriptionStatus}Plan`)}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">{userText('account')}</p>
                  <p className="mt-1 text-sm font-medium text-white">{user.username}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-white/85">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/10 px-4 py-3">
                  <span>{userText('membershipStatus')}</span>
                  <span className={isExpired ? 'font-semibold text-amber-200' : 'font-semibold text-emerald-200'}>
                    {isExpired ? common('expired') : subscriptionStatus === 'free' ? common('starterAccess') : common('active')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/10 px-4 py-3">
                  <span>{userText('renewalDate')}</span>
                  <span className="font-semibold text-white">
                    {subscriptionExpires ? subscriptionExpires.toLocaleDateString() : common('noRenewalScheduled')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/10 px-4 py-3">
                  <span>Billing</span>
                  <span className="font-semibold text-white">
                    {subscriptionInfo?.billingMode ? billingModeLabel : 'Free plan'}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm font-medium text-white">{userText('unlocksTitle')}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {userText('unlocksBody')}
                </p>
                {subscriptionStatus === 'free' && (
                  <Link
                    href="/pricing"
                    className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {userText('upgrade')}
                  </Link>
                )}
                {subscriptionInfo?.active && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {canManageRecurring && !subscriptionInfo.cancelAtPeriodEnd && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={subscriptionLoading}
                        className="inline-flex rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-60"
                      >
                        Cancel auto-renew
                      </button>
                    )}
                    {canManageRecurring && subscriptionInfo.cancelAtPeriodEnd && (
                      <button
                        onClick={handleReactivateSubscription}
                        disabled={subscriptionLoading}
                        className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
                      >
                        Reactivate auto-renew
                      </button>
                    )}
                    {!subscriptionInfo.autoRenew && (
                      <Link
                        href="/pricing"
                        className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
                      >
                        Renew or change plan
                      </Link>
                    )}
                  </div>
                )}
                {subscriptionInfo?.cancelAtPeriodEnd && (
                  <p className="mt-3 text-sm text-amber-100">
                    Auto-renew is off. Your access stays active until {subscriptionExpires?.toLocaleDateString()}.
                  </p>
                )}
                {subscriptionError && (
                  <p className="mt-3 text-sm text-amber-100">{subscriptionError}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{stat.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {userText('quickActions')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {userText('jumpBack')}
                </h2>
              </div>
              <Link href="/reader" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                {userText('openReader')}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <ActionIcon type={action.type} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{action.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-blue-600">
                    {userText('openNow')}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.4)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {userText('profile')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{userText('accountDetails')}</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('username')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{user.username}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('fullName')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{user.fullName || userText('notSetYet')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('referralCode')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{referralInfo?.referralCode || user.referralCode || userText('notSetYet')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Feature access</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Translation: {entitlements?.canTranslateSentences ? 'Unlocked' : 'Upgrade required'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Text to speech: {entitlements?.canUseTextToSpeech ? 'Unlocked' : 'Upgrade required'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Word Book: {entitlements?.canUseWordBook === false ? 'Locked' : 'Available'}
                  </p>
                </div>
                {subscriptionLoading && (
                  <p className="text-sm text-slate-500">Refreshing subscription details...</p>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.4)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {userText('referralTitle')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{userText('referralSubtitle')}</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('referralLink')}</p>
                  <p className="mt-2 break-all text-sm text-slate-700">{referralInfo?.referralLink || '-'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalReferrals')}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{referralInfo?.totalReferrals ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalCommission')}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">¥{(referralInfo?.totalCommission ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('pendingCommission')}</p>
                    <p className="mt-2 text-base font-medium text-slate-900">¥{(referralInfo?.pendingCommission ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('paidCommission')}</p>
                    <p className="mt-2 text-base font-medium text-slate-900">¥{(referralInfo?.paidCommission ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {userText('recentActivity')}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{userText('latestReads')}</h2>
                </div>
                <Link href="/history" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  {common('viewAll')}
                </Link>
              </div>

              {recentArticles.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-base font-medium text-slate-900">{userText('noHistoryYet')}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {userText('noHistoryBody')}
                  </p>
                  <Link
                    href="/news"
                    className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    {common('startReading')}
                  </Link>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {recentArticles.map((article) => (
                    <Link
                      key={article.key}
                      href={article.routeUrl}
                      className="block rounded-[22px] border border-slate-200 px-4 py-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <p className="line-clamp-2 text-base font-semibold text-slate-900">
                        {article.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span>{article.subtitle}</span>
                        <span>{article.wordCount.toLocaleString()} words</span>
                        <span>{article.readingTime} {common('minute_other')}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
