import { useState, useEffect, useCallback } from 'react';
import { locales, LocaleKey, defaultLocale } from '../locales';
import { storage } from '../utils/storage';

// Helper function to get nested properties from an object
const getNestedValue = (obj: any, path: string): string => {
  const keys = path.split('.');
  // Ensure that obj is not undefined before trying to reduce it
  const result = keys.reduce((acc, key) => (acc && typeof acc === 'object' && acc[key] !== undefined ? acc[key] : undefined), obj);
  return result || path; // Return the path if the result is undefined
};

export const useLocale = () => {
  // Initialize with defaultLocale. This will be the state until the useEffect runs.
  const [currentLocale, setCurrentLocale] = useState<LocaleKey>(defaultLocale);
  //console.log(`[useLocale] HOOK INSTANCE: Initialized. Default locale: ${defaultLocale}. Initial state for currentLocale: ${currentLocale}`);

  // Load locale from storage on mount
  useEffect(() => {
    //console.log(`[useLocale] MOUNT EFFECT: Starts. Current state before load: ${currentLocale}`);
    const loadLocale = () => {
      try {
        const storedLocale = storage.get('locale', defaultLocale) as LocaleKey;
        //console.log(`[useLocale] MOUNT EFFECT: storage.get found: ${storedLocale}`);
        if (Object.keys(locales).includes(storedLocale)) {
          if (currentLocale !== storedLocale) {
            //console.log(`[useLocale] MOUNT EFFECT: Stored locale (${storedLocale}) is different. Setting state.`);
            setCurrentLocale(storedLocale);
          } else {
            //console.log(`[useLocale] MOUNT EFFECT: Stored locale (${storedLocale}) is same as current. No change needed.`);
          }
        } else {
          //console.log(`[useLocale] MOUNT EFFECT: Stored locale (${storedLocale}) is invalid. Ensuring default (${defaultLocale}).`);
          if (currentLocale !== defaultLocale) {
            setCurrentLocale(defaultLocale);
          }
        }
      } catch (error: unknown) {
        console.error('[useLocale] MOUNT EFFECT: Failed to load locale from storage:', error);
        if (currentLocale !== defaultLocale) {
          //console.log(`[useLocale] MOUNT EFFECT: Error loading. Ensuring default (${defaultLocale}).`);
          setCurrentLocale(defaultLocale); // Fallback to defaultLocale
        }
      }
    };

    loadLocale();
    //console.log(`[useLocale] MOUNT EFFECT: Ends. Current state after load attempt: ${currentLocale}`); // This will log the state before setCurrentLocale from this effect actually re-renders the hook
  }, []); // Empty dependency array, runs once on mount

  // Save locale to storage when it changes
  useEffect(() => {
    // This effect runs AFTER the initial render + MOUNT EFFECT, and then on subsequent changes to currentLocale.
    //console.log(`[useLocale] SAVE EFFECT: currentLocale is now ${currentLocale}. Saving to storage.`);
    const saveLocale = () => {
      try {
        storage.set('locale', currentLocale);
        //console.log(`[useLocale] SAVE EFFECT: Saved ${currentLocale} to storage.`);
      } catch (error: unknown) {
        console.error('[useLocale] SAVE EFFECT: Failed to save locale to storage:', error);
      }
    };
    saveLocale();
  }, [currentLocale]);

  // Change the locale
  const changeLocale = useCallback((locale: LocaleKey) => {
    //console.log(`[useLocale] changeLocale called with: ${locale}. Current state is: ${currentLocale}`);
    if (Object.keys(locales).includes(locale)) {
      if (locale !== currentLocale) {
        //console.log(`[useLocale] changeLocale: Setting currentLocale state to: ${locale}`);
        setCurrentLocale(locale);
      } else {
        //console.log(`[useLocale] changeLocale: New locale is same as current. No change.`);
      }
    } else {
      console.error(`[useLocale] Locale ${locale} not supported.`);
    }
  }, [currentLocale]);

  // Translate function
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

  //console.log(`[useLocale] HOOK INSTANCE: Returning. currentLocale is ${currentLocale}`);

  return {
    locale: currentLocale,
    changeLocale,
    t,
    wordList: useCallback((key: string) => t(`wordList.${key}`), [t]),
    proficiency: useCallback((key: string) => t(`proficiency.${key}`), [t]),
    website: {
      navigation: useCallback((key: string) => t(`website.navigation.${key}`), [t]),
      homePage: useCallback((key: string) => t(`website.homePage.${key}`), [t]),
      newsPage: useCallback((key: string) => t(`website.newsPage.${key}`), [t]),
      pricingPage: useCallback((key: string) => t(`website.pricingPage.${key}`), [t]),
    }
  };
}; 
