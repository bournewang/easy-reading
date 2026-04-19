'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocaleContext } from '@easy-reading/shared/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  READER_WARNING_EVENT_NAME,
  getStoredReaderWarning,
  type ReaderWarning,
} from '@easy-reading/shared';
import { getCachedAnonymousLimits } from '@/utils/anonymous-limits';

export default function AnonymousReaderWarning() {
  const [warning, setWarning] = useState<ReaderWarning | null>(null);
  const { locale, t } = useLocaleContext();
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

  const title = hasExpiredPro ? readerWarning('expiredTitle') : readerWarning('title');

  const reachedMessage =
    warning
      ? warning.feature === 'tts'
        ? readerWarning('ttsReached')
        : readerWarning('translationReached')
      : readerWarning('expiredPlan');

  const formatLimitLine = (feature: 'translation' | 'tts', count: number) => {
    if (locale === 'zh') {
      return feature === 'translation'
        ? `句子翻译：每天 ${count} 次`
        : `文本转语音：每天 ${count} 次`;
    }

    return feature === 'translation'
      ? `Sentence translation: ${count}/day`
      : `Text to speech: ${count}/day`;
  };

  useEffect(() => {
    setWarning(getStoredReaderWarning());

    const handleWarningChange = (event: Event) => {
      const customEvent = event as CustomEvent<ReaderWarning | null>;
      setWarning(customEvent.detail ?? getStoredReaderWarning());
    };

    window.addEventListener(READER_WARNING_EVENT_NAME, handleWarningChange as EventListener);
    return () => {
      window.removeEventListener(READER_WARNING_EVENT_NAME, handleWarningChange as EventListener);
    };
  }, []);

  if (!warning && !hasExpiredPro) {
    return null;
  }

  return (
    <div className="mb-5">
      <div className="rounded-[28px] border border-[#f4d7a1] bg-white px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
          {title}
        </p>
        <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.37px] text-[#1d1d1f]">{reachedMessage}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px] tracking-[-0.12px] text-black/64">
          <span className="rounded-full bg-[#f5f5f7] px-3 py-1.5">
            {formatLimitLine('translation', limits.translationDailyLimit)}
          </span>
          <span className="rounded-full bg-[#f5f5f7] px-3 py-1.5">
            {formatLimitLine('tts', limits.ttsDailyLimit)}
          </span>
        </div>
        <p className="mt-3 text-[14px] leading-[1.5] tracking-[-0.22px] text-black/64">
          {hasExpiredPro ? readerWarning('expiredBody') : isLoggedIn ? readerWarning('memberBody') : readerWarning('body')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isLoggedIn ? (
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full bg-[#1d1d1f] px-4 py-2 text-[14px] font-medium tracking-[-0.22px] text-white transition-colors hover:bg-black"
            >
              {readerWarning('upgrade')}
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-[#1d1d1f] px-4 py-2 text-[14px] font-medium tracking-[-0.22px] text-white transition-colors hover:bg-black"
              >
                {readerWarning('register')}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[#0066cc] bg-white px-4 py-2 text-[14px] font-medium tracking-[-0.22px] text-[#0066cc] transition-colors hover:bg-[#0071e3]/[0.06]"
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
