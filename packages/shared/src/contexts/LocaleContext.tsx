'use client'; // Mark this module as a Client Component module

import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { locales, LocaleKey, defaultLocale } from '../locales';
import { storage } from '../utils/storage';

interface LocaleContextType {
  locale: LocaleKey;
  changeLocale: (locale: LocaleKey) => void;
  t: (key: string, fallback?: string) => string;
  // Add other specific t-functions if they are part of the context value, e.g., website, proficiency
  wordList: (key: string) => string; 
  proficiency: (key: string) => string;
  website: {
    navigation: (key: string) => string;
    homePage: (key: string) => string;
    newsPage: (key: string) => string;
    pricingPage: (key: string) => string;
  };
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const getNestedValue = (obj: any, path: string): string => {
    const keys = path.split('.');
    // Ensure that obj is not undefined before trying to reduce it
    const result = keys.reduce((acc, key) => (acc && typeof acc === 'object' && acc[key] !== undefined ? acc[key] : undefined), obj);
    return result || path; // Return the path if the result is undefined
  };
  
export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentLocale, setCurrentLocale] = useState<LocaleKey>(defaultLocale);
  //console.log(`[LocaleProvider] Instance created/rendered. Initializing state with defaultLocale: ${defaultLocale}. Current state for currentLocale: ${currentLocale}`);

  // Load from storage
  useEffect(() => {
    //console.log(`[LocaleProvider] MOUNT/INIT EFFECT: Starts. Current state before load: ${currentLocale}`);
    const storedLocale = storage.get('locale', defaultLocale) as LocaleKey;
    //console.log(`[LocaleProvider] MOUNT/INIT EFFECT: storage.get found: ${storedLocale}`);
    if (Object.keys(locales).includes(storedLocale)) {
      if (currentLocale !== storedLocale) {
        //console.log(`[LocaleProvider] MOUNT/INIT EFFECT: Stored locale (${storedLocale}) is different. Setting state.`);
        setCurrentLocale(storedLocale);
      }
    }
  }, []);

  // Save to storage
  useEffect(() => {
    //console.log(`[LocaleProvider] SAVE EFFECT: currentLocale is now ${currentLocale}. Saving to storage.`);
    storage.set('locale', currentLocale);
  }, [currentLocale]);

  const changeLocale = useCallback((locale: LocaleKey) => {
    //console.log(`[LocaleProvider] changeLocale called with: ${locale}. Current internal state is: ${currentLocale}`);
    if (Object.keys(locales).includes(locale)) {
      if (locale !== currentLocale) {
        //console.log(`[LocaleProvider] changeLocale: Setting internal currentLocale state to: ${locale}`);
        setCurrentLocale(locale);
      } else {
        //console.log(`[LocaleProvider] changeLocale: New locale is same as current. No change.`);
      }
    }
  }, [currentLocale]);

  const t = useCallback((key: string, fallback?: string): string => {
    //console.log(`[useLocale] t: Translating key '${key}' for locale '${currentLocale}'.`);
    // Log the specific translation object being used
    //console.log("locales[defaultLocale]: ", locales[defaultLocale])
    if (!locales[currentLocale]) {
      console.error(`[useLocale] t: No translations found for locale '${currentLocale}'! Falling back to defaultLocale structure if available for path.`);
      // Attempt to use defaultLocale structure for getNestedValue path, but this is a problem indicator
      const translationFromDefaultStructure = getNestedValue(locales[defaultLocale], key);
      //console.log("translationFromDefaultStructure: ", translationFromDefaultStructure)
      if (translationFromDefaultStructure !== key) {
        console.warn(`[useLocale] t: Key '${key}' found in defaultLocale structure, but currentLocale '${currentLocale}' is missing.`);
        // Decide if you want to return this or the key/fallback
      }
    } else {
      // //console.log(`[useLocale] t: Using translation object for '${currentLocale}':`, locales[currentLocale]);
    }
    const translation = getNestedValue(locales[currentLocale] || locales[defaultLocale], key); // Fallback to defaultLocale object if current is missing
    
    if (translation === key && fallback) {
      // //console.log(`[useLocale] t: Key '${key}' not found in '${currentLocale}' or default, using fallback: '${fallback}'`);
      return fallback;
    }
    // //console.log(`[useLocale] t: Key '${key}' translated to '${translation}' for locale '${currentLocale}'`);
    return translation;
  }, [currentLocale]);
  
  // Recreate namespaced functions when t changes (which happens when currentLocale changes)
  const wordList = useCallback((key: string) => t(`wordList.${key}`), [t]);
  const proficiency = useCallback((key: string) => t(`proficiency.${key}`), [t]);
  const websiteNavigation = useCallback((key: string) => t(`website.navigation.${key}`), [t]);
  const websiteHomePage = useCallback((key: string) => t(`website.homePage.${key}`), [t]);
  const websiteNewsPage = useCallback((key: string) => t(`website.newsPage.${key}`), [t]);
  const websitePricingPage = useCallback((key: string) => t(`website.pricingPage.${key}`), [t]);

  // Memoize the context value
  const value = useMemo(() => {
    //console.log(`[LocaleProvider] Memoizing context value. currentLocale is: ${currentLocale}`);
    return {
      locale: currentLocale,
      changeLocale,
      t,
      wordList,
      proficiency,
      website: {
        navigation: websiteNavigation,
        homePage: websiteHomePage,
        newsPage: websiteNewsPage,
        pricingPage: websitePricingPage,
      }
    };
  }, [currentLocale, changeLocale, t, wordList, proficiency, websiteNavigation, websiteHomePage, websiteNewsPage, websitePricingPage]);

  //console.log(`[LocaleProvider] Rendering Provider component. Passing value with locale: ${value.locale}`);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocaleContext = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
};
