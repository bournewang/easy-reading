'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DAILY_USAGE_EVENT_NAME,
  READER_WARNING_EVENT_NAME,
  getStoredReaderWarning,
  getDailyUsage,
  type ReaderWarning,
} from '@easy-reading/shared';
import { getCachedAnonymousLimits } from '@/utils/anonymous-limits';

export default function AnonymousReaderWarning() {
  const [warning, setWarning] = useState<ReaderWarning | null>(null);
  const [usedCounts, setUsedCounts] = useState({ translation: 0, tts: 0 });
  const { t } = useLocaleContext();
  const { user, entitlements } = useAuth();
  const readerWarning = (key: string) => t(`website.readerWarning.${key}`);
  const anonymousLimits = getCachedAnonymousLimits();
  const limits = {
    translationDailyLimit: entitlements?.translationDailyLimit ?? anonymousLimits.translationDailyLimit,
    ttsDailyLimit: entitlements?.ttsDailyLimit ?? anonymousLimits.ttsDailyLimit,
  };
  const isLoggedIn = Boolean(user);
  const subscriptionExpires = user?.subscriptionExpires ? new Date(user.subscriptionExpires) : null;
  const hasExpiredPro =
    Boolean(user)
    && user?.subscriptionTier === 'free'
    && Boolean(subscriptionExpires && !Number.isNaN(subscriptionExpires.getTime()) && subscriptionExpires.getTime() <= Date.now());

  useEffect(() => {
    setWarning(getStoredReaderWarning());
    setUsedCounts(getDailyUsage());

    const handleWarningChange = (event: Event) => {
      const customEvent = event as CustomEvent<ReaderWarning | null>;
      setWarning(customEvent.detail ?? getStoredReaderWarning());
      setUsedCounts(getDailyUsage());
    };

    const handleUsageChange = () => {
      setUsedCounts(getDailyUsage());
    };

    window.addEventListener(READER_WARNING_EVENT_NAME, handleWarningChange as EventListener);
    window.addEventListener(DAILY_USAGE_EVENT_NAME, handleUsageChange as EventListener);
    return () => {
      window.removeEventListener(READER_WARNING_EVENT_NAME, handleWarningChange as EventListener);
      window.removeEventListener(DAILY_USAGE_EVENT_NAME, handleUsageChange as EventListener);
    };
  }, []);

  // Clamp displayed count to at least the limit when that feature hit the limit
  const ttsUsed = warning?.feature === 'tts'
    ? Math.max(usedCounts.tts, limits.ttsDailyLimit)
    : usedCounts.tts;
  const translationUsed = warning?.feature === 'translation'
    ? Math.max(usedCounts.translation, limits.translationDailyLimit)
    : usedCounts.translation;

  const isLimitReached = Boolean(warning) || hasExpiredPro;
  const ttsAtLimit = ttsUsed >= limits.ttsDailyLimit;
  const translationAtLimit = translationUsed >= limits.translationDailyLimit;

  // Hide before the user has used anything and no limit/expiry is active
  if (!isLimitReached && ttsUsed === 0 && translationUsed === 0) {
    return null;
  }

  const badgeTitle = hasExpiredPro
    ? readerWarning('expiredTitle')
    : isLimitReached
      ? readerWarning('title')
      : readerWarning('usageTitle');

  const reachedFeatures = new Set(warning?.features || (warning?.feature ? [warning.feature] : []));

  const normalizedTtsUsed = reachedFeatures.has('tts')
    ? Math.max(ttsUsed, limits.ttsDailyLimit)
    : ttsUsed;
  const normalizedTranslationUsed = reachedFeatures.has('translation')
    ? Math.max(translationUsed, limits.translationDailyLimit)
    : translationUsed;

  const normalizedTtsAtLimit = normalizedTtsUsed >= limits.ttsDailyLimit;
  const normalizedTranslationAtLimit = normalizedTranslationUsed >= limits.translationDailyLimit;

  const limitRows = [
    normalizedTtsAtLimit
      ? {
          key: 'tts',
          message: readerWarning('ttsReached'),
          label: 'TTS',
          used: normalizedTtsUsed,
          limit: limits.ttsDailyLimit,
        }
      : null,
    normalizedTranslationAtLimit
      ? {
          key: 'translation',
          message: readerWarning('translationReached'),
          label: 'Trans.',
          used: normalizedTranslationUsed,
          limit: limits.translationDailyLimit,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: 'tts' | 'translation';
    message: string;
    label: string;
    used: number;
    limit: number;
  }>;

  const message = hasExpiredPro
    ? readerWarning('expiredPlan')
    : isLimitReached && limitRows.length === 0
      ? warning?.feature === 'tts'
        ? readerWarning('ttsReached')
        : warning?.feature === 'translation'
          ? readerWarning('translationReached')
          : null
      : null;

  return (
    <div className="mb-3">
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] border bg-white px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.06)] ${isLimitReached ? 'border-[#f4d7a1]' : 'border-black/[0.06]'}`}>
        <span className={`shrink-0 text-[12px] font-semibold uppercase tracking-[0.12em] ${isLimitReached ? 'text-[#ff3b30]' : 'text-[#0071e3]'}`}>
          {badgeTitle}
        </span>
        {message && (
          <span className="text-[14px] leading-snug tracking-[-0.224px] text-[#1d1d1f]">
            {message}
          </span>
        )}
        {limitRows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-snug tracking-[-0.224px] text-[#1d1d1f]">
            {limitRows.map((row) => (
              <span key={row.key} className="inline-flex flex-wrap items-center gap-1.5">
                <span>{row.message}</span>
                <span className="tabular-nums whitespace-nowrap text-[#ff3b30]">
                  &nbsp;
                  <strong className="text-[#ff3b30]">{row.used}</strong>/{row.limit}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] tracking-[-0.16px]">
            <span className={`tabular-nums ${normalizedTtsAtLimit ? 'text-[#ff3b30]' : 'text-black/50'}`}>
              TTS&nbsp;<strong className={normalizedTtsAtLimit ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}>{normalizedTtsUsed}</strong>/{limits.ttsDailyLimit}
            </span>
            <span className="text-black/20">·</span>
            <span className={`tabular-nums ${normalizedTranslationAtLimit ? 'text-[#ff3b30]' : 'text-black/50'}`}>
              Trans.&nbsp;<strong className={normalizedTranslationAtLimit ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}>{normalizedTranslationUsed}</strong>/{limits.translationDailyLimit}
            </span>
          </div>
        )}
        <div className="ml-auto flex shrink-0 gap-2">
          {isLoggedIn ? (
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full bg-[#1d1d1f] px-3.5 py-1.5 text-[14px] font-medium tracking-[-0.224px] text-white transition-colors hover:bg-black"
            >
              {readerWarning('upgrade')}
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-[#1d1d1f] px-3.5 py-1.5 text-[14px] font-medium tracking-[-0.224px] text-white transition-colors hover:bg-black"
              >
                {readerWarning('register')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[#0066cc] bg-white px-3.5 py-1.5 text-[14px] font-medium tracking-[-0.224px] text-[#0066cc] transition-colors hover:bg-[#0071e3]/[0.06]"
              >
                {readerWarning('login')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

