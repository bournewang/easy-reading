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
  //console.log(`[LanguageSwitcher] Rendering. Locale from context: ${locale}`);

  const toggleLocale = () => {
    const nextLocale: LocaleKey = locale === 'en' ? 'zh' : 'en';
    //console.log(`[LanguageSwitcher] Toggling locale. Current: ${locale}, Next: ${nextLocale}`);
    changeLocale(nextLocale); // This will call the changeLocale from LocaleProvider
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-[#1d1d1f]/82 transition-all hover:bg-[#e8f2ff] hover:text-[#005bb5]"
      title={`Switch to ${locale === 'en' ? 'Chinese' : 'English'}`}
    >
      <span className="text-lg">{LOCALE_FLAGS[locale === 'en' ? 'zh' : 'en']}</span>
    </button>
  );
}; 
