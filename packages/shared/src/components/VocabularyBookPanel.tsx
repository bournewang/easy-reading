'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocaleContext } from '../contexts/LocaleContext';
import type { VocabularyBookWordDetails } from '../types/vocabularyBook';
import {
  getStoredPreferredPhonetic,
  playYoudaoAudio,
  setStoredPreferredPhonetic,
  type YoudaoAccent,
} from '../utils/helper';
import { DefaultSpeechSwitch, getSpeechAccentLabel, getSpeechAccentTitle } from './Tips';

interface VocabularyBookPanelProps {
  selectedWord?: string | null;
  details: VocabularyBookWordDetails[];
}

export default function VocabularyBookPanel({ selectedWord, details }: VocabularyBookPanelProps) {
  const { locale } = useLocaleContext();
  const [preferredPhonetic, setPreferredPhonetic] = useState<YoudaoAccent>(() => getStoredPreferredPhonetic());
  const lastAutoPlayedKeyRef = useRef<string | null>(null);
  const sfDisplay = '"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const sfText = '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const handlePlayYoudaoAudio = useCallback((word: string, accent: YoudaoAccent) => {
    void playYoudaoAudio(word, accent).catch((error: unknown) => {
      console.error('Failed to play vocabulary audio:', error);
    });
  }, []);

  const handlePreferredPhoneticChange = useCallback((accent: YoudaoAccent) => {
    setPreferredPhonetic(accent);
    setStoredPreferredPhonetic(accent);
  }, []);

  useEffect(() => {
    if (!selectedWord || details.length === 0) {
      lastAutoPlayedKeyRef.current = null;
      return;
    }

    const first = details[0];
    const autoPlayKey = `${selectedWord}|${first.bookId}|${first.headWord}`;
    if (lastAutoPlayedKeyRef.current === autoPlayKey) {
      return;
    }

    handlePlayYoudaoAudio(first.headWord, preferredPhonetic);
    lastAutoPlayedKeyRef.current = autoPlayKey;
  }, [details, handlePlayYoudaoAudio, preferredPhonetic, selectedWord]);

  const hasDetails = details.length > 0;

  return (
    <>
      <div
        className="sticky top-0 z-10 border-b border-black/6 bg-white px-3 py-3"
        style={{ fontFamily: sfText }}
      >
        <div className="relative flex items-center justify-center">
          <div
            className="text-center text-[12px] font-semibold uppercase text-black/56"
            style={{ letterSpacing: '-0.12px', lineHeight: '1.33' }}
          >
            {locale === 'zh' ? '单词释义' : 'Vocabulary Details'}
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <DefaultSpeechSwitch
              preferredPhonetic={preferredPhonetic}
              onChange={handlePreferredPhoneticChange}
              locale={locale}
              textClassName="text-[10px] font-semibold uppercase text-black/40"
            />
          </div>
        </div>
      </div>

      <div className="bg1-[#f5f5f7] p-2 xl:h-full xl:overflow-y-auto">
        {!selectedWord ? (
          <div
            className="rounded-[12px] bg-white p-4 text-[14px] text-black/56 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
            style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
          >
            {locale === 'zh' ? '点击文中单词后，这里会显示单词释义。' : 'Click a word to view vocabulary details.'}
          </div>
        ) : null}

        {selectedWord && !hasDetails ? (
          <div
            className="rounded-[12px] bg-white p-4 text-[14px] text-black/56 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
            style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
          >
            {locale === 'zh'
              ? '所选词书中没有该单词的条目。'
              : 'This word is not found in selected vocabulary books.'}
          </div>
        ) : null}

        {details.map((item) => (
          <div
            key={`${item.bookId}-${item.headWord}`}
            className="mb-4 rounded-[12px] bg-white p-4 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3
                  className="text-[28px] font-semibold text-[#1d1d1f]"
                  style={{ fontFamily: sfDisplay, letterSpacing: '0.196px', lineHeight: '1.14' }}
                >
                  {item.headWord}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p
                    className="text-[12px] text-black/56"
                    style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                  >
                    {item.bookTitle}
                  </p>
                  {/* <span
                    className="rounded-full border border-black/10 bg-[#fafafc] px-2 py-0.5 text-[10px] font-semibold uppercase text-black/52"
                    style={{ fontFamily: sfText, letterSpacing: '-0.08px', lineHeight: '1.47' }}
                  >
                    {item.bookId.replace(/\.json$/i, '')}
                  </span> */}
                </div>
                <p
                  className="mt-1 text-[12px] text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {[
                    item.ukPhone ? `${getSpeechAccentLabel(locale, 'uk')} ${item.ukPhone}` : '',
                    item.usPhone ? `${getSpeechAccentLabel(locale, 'us')} ${item.usPhone}` : '',
                  ]
                    .filter(Boolean)
                    .join('\n')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlayYoudaoAudio(item.headWord, 'uk')}
                  className="inline-flex items-center gap-1 rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1.5 text-[14px] font-normal text-[#0066cc] transition-colors hover:underline"
                  style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                  title={getSpeechAccentTitle(locale, 'uk')}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{getSpeechAccentLabel(locale, 'uk')}</span>
                </button>
                <button
                  onClick={() => handlePlayYoudaoAudio(item.headWord, 'us')}
                  className="inline-flex items-center gap-1 rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1.5 text-[14px] font-normal text-[#0066cc] transition-colors hover:underline"
                  style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                  title={getSpeechAccentTitle(locale, 'us')}
                >
                  <span aria-hidden="true">🔊</span>
                  <span>{getSpeechAccentLabel(locale, 'us')}</span>
                </button>
              </div>
            </div>

            {item.explanation.length > 0 && (
              <div className="mb-3 rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '释义' : 'Explanation'}
                </p>
                <ul className="space-y-1">
                  {item.explanation.slice(0, 4).map((line, index) => (
                    <li
                      key={index}
                      className="text-[17px] text-black/80"
                      style={{ fontFamily: sfText, letterSpacing: '-0.374px', lineHeight: '1.47' }}
                    >
                      {index + 1}. {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.examples.length > 0 && (
              <div className="mb-3 rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '例句' : 'Examples'}
                </p>
                <ul className="space-y-2">
                  {item.examples.slice(0, 3).map((example, index) => (
                    <li key={index}>
                      <p
                        className="text-[14px] text-black/80"
                        style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                      >
                        {example.en}
                      </p>
                      {example.cn ? (
                        <p
                          className="mt-1 text-[14px] text-black/56"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          {example.cn}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.phrases.length > 0 && (
              <div className="rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '短语' : 'Phrases'}
                </p>
                <ul className="space-y-1">
                  {item.phrases.slice(0, 5).map((phrase, index) => (
                    <li
                      key={index}
                      className="text-[14px] text-black/72"
                      style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                    >
                      <span className="font-semibold text-black/86">{phrase.text}</span>
                      {phrase.cn ? <span className="text-black/56"> - {phrase.cn}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
