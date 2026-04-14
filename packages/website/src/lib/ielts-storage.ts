export const LAST_IELTS_TEST_STORAGE_KEY = 'lastPracticedIeltsTest';

export function readLastIELTSTestRoute(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LAST_IELTS_TEST_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { route?: string };
    if (!parsed.route || typeof parsed.route !== 'string') {
      return null;
    }

    return parsed.route;
  } catch {
    return null;
  }
}

export function saveLastIELTSTestRoute(route: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LAST_IELTS_TEST_STORAGE_KEY, JSON.stringify({ route }));
}
