const DAILY_USAGE_KEY = 'easy_reading_daily_usage';

export const DAILY_USAGE_EVENT_NAME = 'easy-reading-daily-usage';

type DailyUsage = {
  translation: number;
  tts: number;
  date: string;
};

function getLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function emitDailyUsageChange(detail: DailyUsage) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<DailyUsage>(DAILY_USAGE_EVENT_NAME, { detail }));
}

export function getDailyUsage(): DailyUsage {
  if (typeof window === 'undefined') {
    return { translation: 0, tts: 0, date: getLocalDateString() };
  }

  const raw = window.localStorage.getItem(DAILY_USAGE_KEY);
  const today = getLocalDateString();

  if (!raw) {
    return { translation: 0, tts: 0, date: today };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    if (parsed.date !== today) {
      window.localStorage.removeItem(DAILY_USAGE_KEY);
      return { translation: 0, tts: 0, date: today };
    }
    return {
      translation: parsed.translation ?? 0,
      tts: parsed.tts ?? 0,
      date: today,
    };
  } catch {
    return { translation: 0, tts: 0, date: today };
  }
}

export function incrementDailyUsage(feature: 'translation' | 'tts'): void {
  if (typeof window === 'undefined') {
    return;
  }

  const current = getDailyUsage();
  const updated: DailyUsage = {
    ...current,
    [feature]: current[feature] + 1,
  };
  window.localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(updated));
  emitDailyUsageChange(updated);
}
