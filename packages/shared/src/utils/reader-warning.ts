export type ReaderWarningFeature = 'translation' | 'tts';

export type ReaderWarning = {
  feature: ReaderWarningFeature;
  features?: ReaderWarningFeature[];
  message: string;
  activeDate: string;
};

export const READER_WARNING_EVENT_NAME = 'easy-reading-reader-warning';
const READER_WARNING_STORAGE_KEY = 'easy_reading_reader_warning';

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emitReaderWarningChange(detail: ReaderWarning | null) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ReaderWarning | null>(READER_WARNING_EVENT_NAME, { detail }));
}

export function getStoredReaderWarning(): ReaderWarning | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(READER_WARNING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReaderWarning>;
    if (!parsed.message || !parsed.feature || !parsed.activeDate) {
      window.localStorage.removeItem(READER_WARNING_STORAGE_KEY);
      return null;
    }

    if (parsed.activeDate !== getLocalDateString()) {
      window.localStorage.removeItem(READER_WARNING_STORAGE_KEY);
      return null;
    }

    const features = Array.from(
      new Set(
        [
          ...(Array.isArray(parsed.features) ? parsed.features : []),
          parsed.feature,
        ].filter((value): value is ReaderWarningFeature => value === 'translation' || value === 'tts'),
      ),
    );

    return {
      message: parsed.message,
      feature: parsed.feature,
      features,
      activeDate: parsed.activeDate,
    };
  } catch {
    window.localStorage.removeItem(READER_WARNING_STORAGE_KEY);
    return null;
  }
}

export function setStoredReaderWarning(feature: ReaderWarningFeature, message: string) {
  if (typeof window === 'undefined' || !message.trim()) {
    return;
  }

  const existingWarning = getStoredReaderWarning();
  const existingFeatures = existingWarning?.activeDate === getLocalDateString()
    ? existingWarning.features || [existingWarning.feature]
    : [];

  const warning: ReaderWarning = {
    feature,
    features: Array.from(new Set([...existingFeatures, feature])),
    message,
    activeDate: getLocalDateString(),
  };

  window.localStorage.setItem(READER_WARNING_STORAGE_KEY, JSON.stringify(warning));
  emitReaderWarningChange(warning);
}

export function clearStoredReaderWarning() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(READER_WARNING_STORAGE_KEY);
  emitReaderWarningChange(null);
}

export function isReaderLimitWarning(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('limit reached')
    && (
      normalized.includes('translation')
      || normalized.includes('tts')
      || normalized.includes('text to speech')
    )
  );
}
