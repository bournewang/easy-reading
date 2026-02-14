import { en } from './en';
import { zh } from './zh';

export const locales = {
  en,
  zh
};

export type LocaleKey = keyof typeof locales;
export type TranslationKeys = typeof en;

export const defaultLocale: LocaleKey = 'zh'; 