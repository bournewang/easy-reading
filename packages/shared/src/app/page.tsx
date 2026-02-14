'use client'; // Required for components using hooks like useState, useEffect, useLocale

import React from 'react';
import Link from 'next/link';
// import { useLocale } from '../hooks/useLocale'; // OLD
import { useLocaleContext } from '../contexts/LocaleContext'; // NEW
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// A simple functional component to ensure useLocale can be used
const TestLocaleComponent = () => {
  // const { locale, t, website } = useLocale(); // OLD
  const { locale, t, website } = useLocaleContext(); // NEW
  console.log(`[TestLocaleComponent] Rendering. Locale from useLocaleContext: ${locale}`);

  const title = t('samplePage.title', 'Sample Page (App Router)');
  const greeting = website?.homePage ? website.homePage('greeting') : t('greeting', 'Hello World from App Router');
  
  console.log(`[TestLocaleComponent] Translated title: ${title}, greeting: ${greeting}`);

  return (
    <div>
      <p>Current Locale (from TestLocaleComponent): {locale}</p>
      <p>Title: {title}</p>
      <p>Greeting: {greeting}</p>
    </div>
  );
};

export default function SharedRootPage() {
  console.log('[SharedRootPage] Rendering.');
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to the Shared Package Testbed (App Router)</h1>
      <p>This page is an index for testing components from the '@easy-reading/shared' package using the App Router.</p>
      
      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #eee' }}>
        <h2>Language Switcher Test</h2>
        <LanguageSwitcher />
        <TestLocaleComponent />
      </div>

      <h2>Available Test Pages</h2>
      <ul>
        <li><Link href="/dictionary">Dictionary</Link></li>
        <li><Link href="/reader">Reader</Link></li>
        <li><Link href="/wordlist">WordList</Link></li>
        {/* To create app router versions, make folders like /app/DictionaryTest/page.tsx */}
      </ul>
    </div>
  );
} 