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
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
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
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }

    if (!hasWindow) {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(key);
      return;
    }

    if (!hasWindow) {
      return;
    }

    window.localStorage.removeItem(key);
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

    const response = await axios.post<ApiResponse>(url, {
      text,
      target_lang: targetLang,
    });

    return (response.data.data as string) || '';
  },

  async translateBatch(texts: string[], targetLang = 'Chinese'): Promise<string[]> {
    const url = process.env.NEXT_PUBLIC_TRANS_API || '';
    if (!url || texts.length === 0) {
      return [];
    }

    const response = await axios.post<ApiResponse>(url, {
      text: texts.join('\n'),
      target_lang: targetLang,
    });

    const content = (response.data.data as string) || '';
    return content ? content.split('\n') : [];
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
