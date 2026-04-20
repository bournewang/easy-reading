'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { formatMessage } from '@/lib/i18n';
import { getReadingHistoryAsync, type ReadingHistoryItem } from '@/utils/reading-history';
import {
  cancelSubscription,
  getSubscriptionSummary,
  reactivateSubscription,
  type SubscriptionSummary,
} from '@/lib/api/subscription';
import { getReferralSummary, type ReferralSummary } from '@/lib/api/referral';
import { useVocabularyBooks } from '@/hooks/useVocabularyBooks';

type ActivityStat = {
  label: string;
  value: string;
  hint: string;
};

type AccountMetric = {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
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

const OverviewIcon = ({ type }: { type: 'account' | 'spark' | 'gift' }) => {
  const iconClassName = 'h-5 w-5';

  if (type === 'spark') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      </svg>
    );
  }

  if (type === 'gift') {
    return (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 7h20v5H2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7H8.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7h3.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" />
      </svg>
    );
  }

  return (
    <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
};

const DashboardCard = ({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/88 p-6 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.42)] backdrop-blur xl:p-7 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
    </div>
    <div className="mt-6">{children}</div>
  </section>
);

export default function UserCenterPage() {
  const { user, entitlements, logout, loading } = useAuth();
  const router = useRouter();
  const { t } = useLocaleContext();
  const [articles, setArticles] = useState<ReadingHistoryItem[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSummary | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralSummary | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
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

    const loadHistory = async () => {
      try {
        const items = await getReadingHistoryAsync();
        if (!cancelled) {
          setArticles(items);
        }
      } catch (error) {
        console.error('Failed to load reading history:', error);
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
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
  const selectedVocabularyCount = selectedBookIds.length;
  const membershipStateLabel = isExpired ? common('expired') : subscriptionStatus === 'free' ? common('starterAccess') : common('active');
  const accountMetrics: AccountMetric[] = [
    {
      label: userText('membershipStatus'),
      value: membershipStateLabel,
      tone: isExpired ? 'warning' : subscriptionStatus === 'free' ? 'default' : 'success',
    },
    {
      label: userText('renewalDate'),
      value: subscriptionExpires ? subscriptionExpires.toLocaleDateString() : common('noRenewalScheduled'),
    },
    {
      label: 'Billing',
      value: subscriptionInfo?.billingMode ? billingModeLabel : 'Free plan',
    },
  ];
  const focusItems = [
    {
      icon: 'spark' as const,
      label: userText('statStreak'),
      value: `${learningStreak} ${common(learningStreak === 1 ? 'day_one' : 'day_other')}`,
      description: userText('statStreakHint'),
    },
    {
      icon: 'account' as const,
      label: 'Vocabulary setup',
      value: `${selectedVocabularyCount}/3 selected`,
      description: 'Highlight words from your chosen vocabulary books directly in the reader.',
    },
    {
      icon: 'gift' as const,
      label: userText('referralTitle'),
      value: `${referralInfo?.totalReferrals ?? 0} invites`,
      description: `¥${(referralInfo?.pendingCommission ?? 0).toFixed(2)} pending commission`,
    },
  ];

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_30%),radial-gradient(circle_at_85%_12%,_rgba(251,191,36,0.16),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_44%,_#eef2f7_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className={`relative overflow-hidden rounded-[36px] bg-gradient-to-br ${planStyles.panel} text-white shadow-[0_30px_100px_-36px_rgba(15,23,42,0.72)]`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_30%)]" />
          <div className="relative grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_360px] lg:px-10 lg:py-10">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/15">
                  {userText('badge')}
                </div>
                <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.9rem] lg:leading-[1.05]">
                  {formatMessage(userText('welcome'), { name: user.fullName || user.username })}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                  {userText('subtitle')}
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[26px] border border-white/12 bg-white/10 px-4 py-5 backdrop-blur-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">{stat.label}</p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{stat.value}</p>
                      <p className="mt-2 text-sm leading-6 text-white/70">{stat.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[28px] border border-white/12 bg-black/12 p-5 backdrop-blur-sm">
                  <div className="flex flex-wrap gap-3">
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

                  <div className="mt-5 space-y-3">
                    {focusItems.map((item) => (
                      <div key={item.label} className="flex gap-3 rounded-[22px] bg-white/10 px-4 py-4 ring-1 ring-white/10">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
                          <OverviewIcon type={item.icon} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">{item.label}</p>
                          <p className="mt-1 text-base font-semibold text-white">{item.value}</p>
                          <p className="mt-1 text-sm leading-6 text-white/72">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-white/12 bg-white/12 p-5 backdrop-blur-sm ring-1 ring-white/10">
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

              <div className="mt-6 grid gap-3">
                {accountMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">{metric.label}</p>
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        metric.tone === 'warning'
                          ? 'text-amber-200'
                          : metric.tone === 'success'
                            ? 'text-emerald-200'
                            : 'text-white'
                      }`}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-sm font-medium text-white">{userText('unlocksTitle')}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{userText('unlocksBody')}</p>
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
                {subscriptionError && <p className="mt-3 text-sm text-amber-100">{subscriptionError}</p>}
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
          <div className="space-y-6">
            <DashboardCard
              eyebrow={userText('quickActions')}
              title={userText('jumpBack')}
              description="Core reading workflows and your recent reading history are grouped here so you can resume without scanning the whole page."
              className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.92)_100%)]"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">{userText('quickActions')}</p>
                    <Link href="/news-reader" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      {userText('openReader')}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {actions.map((action) => (
                      <Link
                        key={action.title}
                        href={action.href}
                        className="group rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_20px_45px_-28px_rgba(14,165,233,0.55)]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                          <ActionIcon type={action.type} />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">{action.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                        <span className="mt-4 inline-flex text-sm font-semibold text-blue-600">{userText('openNow')}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('recentActivity')}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">{userText('latestReads')}</h3>
                    </div>
                    <Link href="/history" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      {common('viewAll')}
                    </Link>
                  </div>

                  {recentArticles.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                      <p className="text-base font-medium text-slate-900">{userText('noHistoryYet')}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{userText('noHistoryBody')}</p>
                      <Link
                        href="/news"
                        className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        {common('startReading')}
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {recentArticles.map((article, index) => (
                        <Link
                          key={article.key}
                          href={article.routeUrl}
                          className="flex gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-base font-semibold text-slate-900">{article.title}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                              <span>{article.subtitle}</span>
                              <span>{article.wordCount.toLocaleString()} words</span>
                              <span>
                                {article.readingTime} {common('minute_other')}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              eyebrow="Vocabulary Books"
              title="Reader highlights"
              description="Choose up to three vocabulary books to shape what the reader highlights and explains while you study."
            >
              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-[26px] bg-slate-950 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Selected now</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">{selectedVocabularyCount}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">Up to three books can be active at once for cleaner, more relevant reader assistance.</p>
                  {savingVocabularyBookSelection && (
                    <p className="mt-4 text-sm text-sky-200">Saving your selection...</p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">Available books</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Selected: {selectedVocabularyCount} / 3
                    </p>
                  </div>

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {loadingVocabularyBookCatalog ? (
                      <p className="text-sm text-slate-500">Loading vocabulary books...</p>
                    ) : vocabularyBookCatalog.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No vocabulary books found. Make sure vocabulary-books folder is properly linked.
                      </p>
                    ) : (
                      vocabularyBookCatalog.map((book) => {
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
                            className={`flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-colors ${
                              checked
                                ? 'border-blue-300 bg-blue-50'
                                : isAtLimit
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                            } ${savingVocabularyBookSelection ? 'opacity-60' : ''}`}
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5 5 9l4.5-5" />
                              </svg>
                            </div>
                            {book.image ? (
                              <img src={book.image} alt={book.title} className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-200" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-slate-900">{book.title}</p>
                                {checked && (
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{book.wordCount.toLocaleString()} words</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            {/* <DashboardCard eyebrow={userText('profile')} title={userText('accountDetails')}>
              <div className="space-y-4">
                <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('username')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{user.username}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('fullName')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{user.fullName || userText('notSetYet')}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('referralCode')}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{referralInfo?.referralCode || user.referralCode || userText('notSetYet')}</p>
                </div>
                <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Feature access</p>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <p>Translation: {entitlements?.canTranslateSentences ? 'Unlocked' : 'Upgrade required'}</p>
                    <p>Text to speech: {entitlements?.canUseTextToSpeech ? 'Unlocked' : 'Upgrade required'}</p>
                    <p>Word Book: {entitlements?.canUseWordBook === false ? 'Locked' : 'Available'}</p>
                  </div>
                </div>
                {subscriptionLoading && <p className="text-sm text-slate-500">Refreshing subscription details...</p>}
              </div>
            </DashboardCard> */}

            <DashboardCard eyebrow={userText('referralTitle')} title={userText('referralSubtitle')}>
              <div className="space-y-4">
                <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('referralLink')}</p>
                  <p className="mt-2 break-all text-sm text-slate-700">{referralInfo?.referralLink || '-'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalReferrals')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{referralInfo?.totalReferrals ?? 0}</p>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('totalCommission')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">¥{(referralInfo?.totalCommission ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('pendingCommission')}</p>
                    <p className="mt-2 text-base font-medium text-slate-900">¥{(referralInfo?.pendingCommission ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{userText('paidCommission')}</p>
                    <p className="mt-2 text-base font-medium text-slate-900">¥{(referralInfo?.paidCommission ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        </section>
      </div>
    </div>
  );
}
