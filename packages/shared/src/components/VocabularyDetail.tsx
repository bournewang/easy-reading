'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocaleContext } from '../contexts/LocaleContext';
import type { VocabularyBookWordDetails } from '../types/vocabularyBook';
import {
  getStoredPreferredPhonetic,
  playYoudaoAudio,
  setStoredPreferredPhonetic,
  subscribePreferredPhoneticChange,
  type YoudaoAccent,
} from '../utils/helper';
import { ChevronIcon } from './icons/ReaderIcons';
import { DefaultSpeechSwitch } from './Tips';
import PronunciationAudioRow from './PronunciationAudioRow';

interface VocabularyDetailProps {
  selectedWord?: string | null;
  details: VocabularyBookWordDetails[];
  mobileExpanded?: boolean;
  onMobileExpandedChange?: (expanded: boolean) => void;
  mobileExpandButtonClassName?: string;
  mobileContentHeightClassName?: string;
}

export default function VocabularyDetail({
  selectedWord,
  details,
  mobileExpanded,
  onMobileExpandedChange,
  mobileExpandButtonClassName = 'md:hidden',
  mobileContentHeightClassName,
}: VocabularyDetailProps) {
  const { locale } = useLocaleContext();
  const [internalMobileExpanded, setInternalMobileExpanded] = useState(false);
  const [preferredPhonetic, setPreferredPhonetic] = useState<YoudaoAccent>(() => getStoredPreferredPhonetic());
  const lastAutoPlayedKeyRef = useRef<string | null>(null);
  const sfDisplay = '"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const sfText = '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const isMobileExpanded = mobileExpanded ?? internalMobileExpanded;
  const mobileContentClassName = mobileContentHeightClassName
    ?? (isMobileExpanded ? 'h-[70dvh] md:h-auto' : 'h-[35dvh] md:h-auto');

  const handlePlayYoudaoAudio = useCallback((word: string, accent: YoudaoAccent) => {
    void playYoudaoAudio(word, accent).catch((error: unknown) => {
      console.error('Failed to play vocabulary audio:', error);
    });
  }, []);

  const handleMobileExpandedChange = useCallback((expanded: boolean) => {
    if (onMobileExpandedChange) {
      onMobileExpandedChange(expanded);
      return;
    }

    setInternalMobileExpanded(expanded);
  }, [onMobileExpandedChange]);

  const handlePreferredPhoneticChange = useCallback((accent: YoudaoAccent) => {
    setPreferredPhonetic(accent);
    setStoredPreferredPhonetic(accent);
  }, []);

  useEffect(() => subscribePreferredPhoneticChange(setPreferredPhonetic), []);

  useEffect(() => {
    if (mobileExpanded !== undefined) {
      return;
    }

    setInternalMobileExpanded(false);
  }, [details, mobileExpanded, selectedWord]);

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
  const firstDetail = details[0];

  return (
    <>
      <div
        className="sticky top-0 z-10 border-b border-black/6 bg-white px-3 py-2"
        style={{ fontFamily: sfText }}
      >
        <div className="relative flex min-h-8 items-center justify-center">
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 text-[12px] font-semibold uppercase text-black/56"
            style={{ letterSpacing: '-0.12px', lineHeight: '1.33' }}
          >
            {locale === 'zh' ? '单词释义' : 'Vocabulary'}
          </div>
          <button
            type="button"
            onClick={() => handleMobileExpandedChange(!isMobileExpanded)}
            className={`inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 ${mobileExpandButtonClassName}`}
            aria-label={isMobileExpanded ? 'Collapse vocabulary panel' : 'Expand vocabulary panel'}
          >
            <ChevronIcon
              className={`h-4 w-4 transition-transform duration-200 ${isMobileExpanded ? 'rotate-0' : 'rotate-180'}`}
            />
          </button>
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

      <div className={`bg-white overflow-y-auto p-2 transition-[height] duration-300 xl:h-full ${mobileContentClassName}`}>
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

        {firstDetail ? (
          <div
            key={`${firstDetail.bookId}-${firstDetail.headWord}`}
            className="mb-4 rounded1-[12px] p-2 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
          >
            <div className="mb-3 flex flex-col gap-2">
              <div>
                <h3
                  className="text-[28px] font-semibold text-[#1d1d1f]"
                  style={{ fontFamily: sfDisplay, letterSpacing: '0.196px', lineHeight: '1.14' }}
                >
                  {firstDetail.headWord}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p
                    className="text-[12px] text-black/56"
                    style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                  >
                    {firstDetail.bookTitle}
                  </p>
                  {/* <span
                    className="rounded-full border border-black/10 bg-[#fafafc] px-2 py-0.5 text-[10px] font-semibold uppercase text-black/52"
                    style={{ fontFamily: sfText, letterSpacing: '-0.08px', lineHeight: '1.47' }}
                  >
                    {item.bookId.replace(/\.json$/i, '')}
                  </span> */}
                </div>
                {/* <p
                  className="mt-1 text-[12px] text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {item.bookTitle}
                </p> */}
              </div>
              <PronunciationAudioRow
                word={firstDetail.headWord}
                locale={locale}
                entries={[
                  { accent: 'uk', phonetic: firstDetail.ukPhone },
                  { accent: 'us', phonetic: firstDetail.usPhone },
                ]}
                onPlay={handlePlayYoudaoAudio}
                style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
              />
            </div>

            {firstDetail.explanation.length > 0 && (
              <div className="mb-3 rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '释义' : 'Explanation'}
                </p>
                <ul className="space-y-1">
                  {firstDetail.explanation.slice(0, 4).map((line, index) => (
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

            {firstDetail.examples.length > 0 && (
              <div className="mb-3 rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '例句' : 'Examples'}
                </p>
                <ul className="space-y-2">
                  {firstDetail.examples.slice(0, 3).map((example, index) => (
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

            {firstDetail.phrases.length > 0 && (
              <div className="rounded-[8px] bg-[#f5f5f7] p-3">
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '短语' : 'Phrases'}
                </p>
                <ul className="space-y-1">
                  {firstDetail.phrases.slice(0, 5).map((phrase, index) => (
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
        ) : null}
      </div>
    </>
  );
}
