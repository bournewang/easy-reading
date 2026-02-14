import React from 'react';
// import { useLocale } from '../hooks/useLocale'; // OLD
import { useLocaleContext } from '../contexts/LocaleContext'; // NEW
import { LocaleKey } from '../locales';

const LOCALE_FLAGS: Record<LocaleKey, string> = {
  en: '🇺🇸',
  zh: '🇨🇳'
};

export const LanguageSwitcher: React.FC = () => {
  // const { locale, changeLocale } = useLocale(); // OLD
  const { locale, changeLocale } = useLocaleContext(); // NEW
  console.log(`[LanguageSwitcher] Rendering. Locale from context: ${locale}`);

  const toggleLocale = () => {
    const nextLocale: LocaleKey = locale === 'en' ? 'zh' : 'en';
    console.log(`[LanguageSwitcher] Toggling locale. Current: ${locale}, Next: ${nextLocale}`);
    changeLocale(nextLocale); // This will call the changeLocale from LocaleProvider
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 transition-all shadow-sm hover:shadow"
      title={`Switch to ${locale === 'en' ? 'Chinese' : 'English'}`}
    >
      <span className="text-lg">{LOCALE_FLAGS[locale === 'en' ? 'zh' : 'en']}</span>
    </button>
  );
}; 