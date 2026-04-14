import type { DictResponse } from './dictionary';

export interface StorageService {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface DictionaryService {
  lookupWord(word: string): Promise<DictResponse>;
}

export interface TranslationService {
  translate(text: string, targetLang?: string): Promise<string>;
  translateBatch(texts: string[], targetLang?: string): Promise<string[]>;
}

export interface TTSService {
  speak(text: string): Promise<void>;
}

export interface ChatService {
  streamChat(payload: Record<string, unknown>): Promise<Response>;
}

export interface SharedServices {
  storage: StorageService;
  dictionary: DictionaryService;
  translation: TranslationService;
  tts: TTSService;
  chat: ChatService;
}
