import { api } from '@/utils/api';

export type AnonymousLimits = {
  translationDailyLimit: number;
  ttsDailyLimit: number;
  wordbookLimit: number;
  historyLimit: number;
};

const ANONYMOUS_LIMITS_STORAGE_KEY = 'easy_reading_anonymous_limits';

export const DEFAULT_ANONYMOUS_LIMITS: AnonymousLimits = {
  translationDailyLimit: 20,
  ttsDailyLimit: 10,
  wordbookLimit: 100,
  historyLimit: 10,
};

let anonymousLimitsPromise: Promise<AnonymousLimits> | null = null;

export function getCachedAnonymousLimits(): AnonymousLimits {
  if (typeof window === 'undefined') {
    return DEFAULT_ANONYMOUS_LIMITS;
  }

  const raw = window.localStorage.getItem(ANONYMOUS_LIMITS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_ANONYMOUS_LIMITS;
  }

  try {
    return {
      ...DEFAULT_ANONYMOUS_LIMITS,
      ...(JSON.parse(raw) as Partial<AnonymousLimits>),
    };
  } catch {
    return DEFAULT_ANONYMOUS_LIMITS;
  }
}

export async function fetchAnonymousLimits(): Promise<AnonymousLimits> {
  if (anonymousLimitsPromise) {
    return anonymousLimitsPromise;
  }

  anonymousLimitsPromise = api
    .get<AnonymousLimits>('/public/anonymous-limits')
    .then((response) => {
      const limits = {
        ...DEFAULT_ANONYMOUS_LIMITS,
        ...response.data,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ANONYMOUS_LIMITS_STORAGE_KEY, JSON.stringify(limits));
      }
      return limits;
    })
    .catch(() => getCachedAnonymousLimits())
    .finally(() => {
      anonymousLimitsPromise = null;
    });

  return anonymousLimitsPromise;
}
