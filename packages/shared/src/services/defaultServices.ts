import axios from 'axios';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { ApiResponse, DictResponse } from '../types';
import type {
  ChatService,
  DictionaryService,
  SharedServices,
  StorageService,
  TranslationService,
  TTSService,
} from '../types/services';

const hasWindow = typeof window !== 'undefined';
const AUTH_TOKEN_STORAGE_KEY = 'easy_reading_auth_token';
const ENTITLEMENTS_STORAGE_KEY = 'easy_reading_entitlements';
const WORDBOOK_STORAGE_KEY = 'english_reader_wordlist';
const ANONYMOUS_ID_STORAGE_KEY = 'easy_reading_anonymous_id';
const ANONYMOUS_LIMITS_STORAGE_KEY = 'easy_reading_anonymous_limits';

type AnonymousLimits = {
  translationDailyLimit: number;
  ttsDailyLimit: number;
  wordbookLimit: number;
  historyLimit: number;
};

const DEFAULT_ANONYMOUS_LIMITS: AnonymousLimits = {
  translationDailyLimit: 20,
  ttsDailyLimit: 10,
  wordbookLimit: 100,
  historyLimit: 10,
};

type StoredEntitlements = {
  canTranslateSentences?: boolean;
  canUseTextToSpeech?: boolean;
  hasUnlimitedTranslation?: boolean;
  hasUnlimitedTextToSpeech?: boolean;
  translationDailyLimit?: number | null;
  ttsDailyLimit?: number | null;
};

function getStoredAuthToken() {
  if (!hasWindow) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function getStoredEntitlements(): StoredEntitlements | null {
  if (!hasWindow) {
    return null;
  }

  const raw = window.localStorage.getItem(ENTITLEMENTS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredEntitlements;
  } catch {
    return null;
  }
}

function generateAnonymousId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateAnonymousId() {
  if (!hasWindow) {
    return '';
  }

  const existing = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = generateAnonymousId();
  window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, created);
  return created;
}

function getCachedAnonymousLimits(): AnonymousLimits {
  if (!hasWindow) {
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

function extractApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getApiBaseUrl() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configuredApiUrl) {
    return `${configuredApiUrl}/api`;
  }
  return '/api-proxy';
}

function hasChromeStorageLocal() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function shouldUseRemoteWordbook(key: string) {
  return hasWindow && !hasChromeStorageLocal() && key === WORDBOOK_STORAGE_KEY && Boolean(getStoredAuthToken());
}

type WordbookEntry = {
  word: string;
};

let anonymousLimitsPromise: Promise<AnonymousLimits> | null = null;
let remoteWordbookCache: {
  token: string | null;
  words: string[] | null;
  promise: Promise<string[]> | null;
} = {
  token: null,
  words: null,
  promise: null,
};

function normalizeWordArray(words: string[]) {
  return Array.from(new Set(words.map((word) => word.trim().toLowerCase()).filter(Boolean)));
}

async function fetchAnonymousLimits(): Promise<AnonymousLimits> {
  if (anonymousLimitsPromise) {
    return anonymousLimitsPromise;
  }

  anonymousLimitsPromise = axios
    .get<AnonymousLimits>(`${getApiBaseUrl()}/public/anonymous-limits`)
    .then((response) => {
      const limits = {
        ...DEFAULT_ANONYMOUS_LIMITS,
        ...response.data,
      };
      if (hasWindow) {
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

async function fetchRemoteWordbook(): Promise<string[]> {
  const token = getStoredAuthToken();
  if (!token) {
    remoteWordbookCache = {
      token: null,
      words: null,
      promise: null,
    };
    return [];
  }

  if (remoteWordbookCache.token === token && remoteWordbookCache.words) {
    return remoteWordbookCache.words;
  }

  if (remoteWordbookCache.token === token && remoteWordbookCache.promise) {
    return remoteWordbookCache.promise;
  }

  const request = axios
    .get<WordbookEntry[]>(`${getApiBaseUrl()}/wordbook`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      const words = normalizeWordArray(response.data.map((entry) => entry.word));
      remoteWordbookCache = {
        token,
        words,
        promise: null,
      };
      return words;
    })
    .catch((error) => {
      remoteWordbookCache = {
        token,
        words: null,
        promise: null,
      };
      throw error;
    });

  remoteWordbookCache = {
    token,
    words: null,
    promise: request,
  };

  return request;
}

async function replaceRemoteWordbook(words: string[]): Promise<void> {
  const token = getStoredAuthToken();
  if (!token) {
    remoteWordbookCache = {
      token: null,
      words: null,
      promise: null,
    };
    return;
  }

  const normalizedWords = normalizeWordArray(words);
  await axios.put(
    `${getApiBaseUrl()}/wordbook`,
    { words: normalizedWords },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  remoteWordbookCache = {
    token,
    words: normalizedWords,
    promise: null,
  };
}

function capWordbookWords(words: string[], limit: number) {
  const capped = normalizeWordArray(words);
  if (capped.length <= limit) {
    return capped;
  }
  return capped.slice(capped.length - limit);
}

async function getStoredArrayValue<T>(key: string): Promise<T[]> {
  if (hasChromeStorageLocal()) {
    const result = await chrome.storage.local.get(key);
    return Array.isArray(result[key]) ? (result[key] as T[]) : [];
  }

  if (!hasWindow) {
    return [];
  }

  const item = window.localStorage.getItem(key);
  if (!item) {
    return [];
  }

  try {
    const parsed = JSON.parse(item) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

type CombinedDictionaryResponse = DictResponse & {
  meta?: {
    fetchedAt?: string;
    translationProvider?: string;
  };
  meanings: Array<
    DictResponse['meanings'][number] & {
      definitions: Array<
        DictResponse['meanings'][number]['definitions'][number] & {
          definition_zh?: string;
        }
      >;
    }
  >;
};

type CombinedDefinition = CombinedDictionaryResponse['meanings'][number]['definitions'][number];

const browserStorage: StorageService = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (shouldUseRemoteWordbook(key)) {
        return (await fetchRemoteWordbook()) as T;
      }

      if (hasChromeStorageLocal()) {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T | undefined) ?? defaultValue;
      }

      if (!hasWindow) {
        return defaultValue;
      }

      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (shouldUseRemoteWordbook(key)) {
      await replaceRemoteWordbook(Array.isArray(value) ? (value as string[]) : []);
      return;
    }

    if (hasChromeStorageLocal()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }

    if (!hasWindow) {
      return;
    }

    let nextValue = value;
    if (key === WORDBOOK_STORAGE_KEY && Array.isArray(value)) {
      const limits = await fetchAnonymousLimits();
      nextValue = capWordbookWords(value as string[], limits.wordbookLimit) as T;
    }

    window.localStorage.setItem(key, JSON.stringify(nextValue));
  },

  async remove(key: string): Promise<void> {
    if (shouldUseRemoteWordbook(key)) {
      await replaceRemoteWordbook([]);
      return;
    }

    if (hasChromeStorageLocal()) {
      await chrome.storage.local.remove(key);
      return;
    }

    if (!hasWindow) {
      return;
    }

    window.localStorage.removeItem(key);
  },

  async addToList<T>(key: string, value: T): Promise<void> {
    if (key === WORDBOOK_STORAGE_KEY && typeof value === 'string' && shouldUseRemoteWordbook(key)) {
      const token = getStoredAuthToken();
      if (!token) {
        return;
      }

      const normalizedWord = normalizeWordArray([value])[0];
      if (!normalizedWord) {
        return;
      }

      await axios.post(
        `${getApiBaseUrl()}/wordbook/${encodeURIComponent(normalizedWord)}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const currentWords =
        remoteWordbookCache.token === token && remoteWordbookCache.words ? remoteWordbookCache.words : [];
      remoteWordbookCache = {
        token,
        words: normalizeWordArray([...currentWords, normalizedWord]),
        promise: null,
      };
      return;
    }

    const currentItems = await getStoredArrayValue<T>(key);
    let nextItems = [...currentItems, value];

    if (key === WORDBOOK_STORAGE_KEY && typeof value === 'string') {
      if (getStoredAuthToken()) {
        nextItems = normalizeWordArray(nextItems as string[]) as T[];
      } else {
        const limits = await fetchAnonymousLimits();
        nextItems = capWordbookWords(nextItems as string[], limits.wordbookLimit) as T[];
      }
    }

    await this.set(key, nextItems);
  },

  async removeFromList<T>(key: string, value: T): Promise<void> {
    if (key === WORDBOOK_STORAGE_KEY && typeof value === 'string' && shouldUseRemoteWordbook(key)) {
      const token = getStoredAuthToken();
      if (!token) {
        return;
      }

      const normalizedWord = normalizeWordArray([value])[0];
      if (!normalizedWord) {
        return;
      }

      await axios.delete(`${getApiBaseUrl()}/wordbook/${encodeURIComponent(normalizedWord)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const currentWords =
        remoteWordbookCache.token === token && remoteWordbookCache.words ? remoteWordbookCache.words : [];
      remoteWordbookCache = {
        token,
        words: currentWords.filter((word) => word !== normalizedWord),
        promise: null,
      };
      return;
    }

    const currentItems = await getStoredArrayValue<T>(key);
    const nextItems = currentItems.filter((item) => item !== value);

    if (nextItems.length > 0) {
      await this.set(key, nextItems);
      return;
    }

    await this.remove(key);
  },
};

const dictionary: DictionaryService = {
  async lookupWord(word: string): Promise<DictResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_DICT_API || 'http://127.0.0.1:4000/api/entries';
    const response = await axios.get<CombinedDictionaryResponse>(`${baseUrl}/${encodeURIComponent(word)}`);
    const data = response.data;

    return {
      ...data,
      meanings: data.meanings.map(meaning => ({
        ...meaning,
        definitions: meaning.definitions.map((definition: CombinedDefinition) => ({
          ...definition,
          translation: definition.translation || definition.definition_zh,
        })),
      })),
    };
  },
};

const translation: TranslationService = {
  async translate(text: string, targetLang = 'Chinese'): Promise<string> {
    const url = process.env.NEXT_PUBLIC_TRANS_API || '';
    if (!url) {
      return '';
    }

    const entitlements = getStoredEntitlements();
    if (entitlements && entitlements.canTranslateSentences === false) {
      throw new Error('Sentence translation is available on paid plans.');
    }

    const token = getStoredAuthToken();
    const anonymousId = token ? null : getOrCreateAnonymousId();

    try {
      const response = await axios.post<ApiResponse>(url, {
        text,
        target_lang: targetLang,
      }, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : anonymousId
            ? { 'X-Anonymous-Id': anonymousId }
            : undefined,
      });

      return (response.data.data as string) || '';
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Translation failed.'));
    }
  },

  async translateBatch(texts: string[], targetLang = 'Chinese'): Promise<string[]> {
    const url = process.env.NEXT_PUBLIC_TRANS_API || '';
    if (!url || texts.length === 0) {
      return [];
    }

    const entitlements = getStoredEntitlements();
    if (entitlements && entitlements.canTranslateSentences === false) {
      throw new Error('Sentence translation is available on paid plans.');
    }

    const token = getStoredAuthToken();
    const anonymousId = token ? null : getOrCreateAnonymousId();

    try {
      const response = await axios.post<ApiResponse>(url, {
        text: texts.join('\n'),
        target_lang: targetLang,
      }, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : anonymousId
            ? { 'X-Anonymous-Id': anonymousId, 'X-Usage-Amount': String(texts.length) }
            : undefined,
      });

      const content = (response.data.data as string) || '';
      return content ? content.split('\n') : [];
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Translation failed.'));
    }
  },
};

const browserSpeechFallback = (text: string) =>
  new Promise<void>((resolve, reject) => {
    if (!hasWindow || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser speech synthesis failed'));
    window.speechSynthesis.speak(utterance);
  });

const tts: TTSService = {
  async speak(text: string): Promise<void> {
    const entitlements = getStoredEntitlements();
    if (entitlements && entitlements.canUseTextToSpeech === false) {
      throw new Error('Text to speech is available on paid plans.');
    }

    const token = getStoredAuthToken();
    const shouldConsumeLimitedTts = !token || entitlements?.hasUnlimitedTextToSpeech !== true;
    if (shouldConsumeLimitedTts) {
      const anonymousId = token ? null : getOrCreateAnonymousId();
      try {
        await axios.post(
          `${getApiBaseUrl()}/usage/tts`,
          null,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : anonymousId
                ? { 'X-Anonymous-Id': anonymousId }
                : undefined,
          },
        );
      } catch (error) {
        throw new Error(extractApiErrorMessage(error, 'Text to speech failed.'));
      }
    }

    const region = process.env.NEXT_PUBLIC_TTS_LOCATION || '';
    const key = process.env.NEXT_PUBLIC_TTS_API_KEY || '';

    if (!key || !region) {
      await browserSpeechFallback(text);
      return;
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    await new Promise<void>((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        () => {
          synthesizer.close();
          resolve();
        },
        error => {
          synthesizer.close();
          reject(error);
        },
      );
    });
  },
};

const chat: ChatService = {
  async streamChat(payload: Record<string, unknown>): Promise<Response> {
    const chatUrl = process.env.NEXT_PUBLIC_AI_CHAT_URL || 'http://127.0.0.1:5000/ai/chat';
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed with status ${response.status}`);
    }

    return response;
  },
};

export const defaultServices: SharedServices = {
  storage: browserStorage,
  dictionary,
  translation,
  tts,
  chat,
};
