export interface Settings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  autoTranslate: boolean;
  translationLanguage: string;
  theme: 'light' | 'dark' | 'sepia';
  voiceType: string;
  speechRate: number;
  autoPronounce: boolean;
}

export const defaultSettings: Settings = {
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'system-ui',
  autoTranslate: false,
  translationLanguage: 'zh-CN',
  theme: 'light',
  voiceType: 'en-US',
  speechRate: 1,
  autoPronounce: false
};