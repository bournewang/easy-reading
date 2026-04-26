const REFERRAL_STORAGE_KEY = 'easy_reading_referral_code';
const REFERRAL_TTL_MS = 3 * 24 * 60 * 60 * 1000;

interface StoredReferralCode {
  code: string;
  capturedAt: number;
}

function normalizeReferralCode(code: string | null | undefined): string {
  if (!code) {
    return '';
  }

  return code.trim().toUpperCase();
}

function parseStoredReferralCode(raw: string | null): StoredReferralCode | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredReferralCode>;
    if (typeof parsed.code !== 'string' || typeof parsed.capturedAt !== 'number') {
      return null;
    }

    return {
      code: normalizeReferralCode(parsed.code),
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return null;
  }
}

export function storeReferralCode(code: string): string {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode || typeof window === 'undefined') {
    return '';
  }

  const payload: StoredReferralCode = {
    code: normalizedCode,
    capturedAt: Date.now(),
  };

  window.localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(payload));
  return normalizedCode;
}

export function getActiveReferralCode(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const stored = parseStoredReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
  if (!stored) {
    return '';
  }

  if (!stored.code || Date.now() - stored.capturedAt > REFERRAL_TTL_MS) {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return '';
  }

  return stored.code;
}
