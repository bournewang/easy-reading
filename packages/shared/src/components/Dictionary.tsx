'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import type { DictResponse } from '../types/dictionary';
import { useTTS } from '../hooks/useTTS';
import { useLocaleContext } from '../contexts/LocaleContext';
import {
  getStoredPreferredPhonetic,
  playYoudaoAudio,
  setStoredPreferredPhonetic,
  subscribePreferredPhoneticChange,
  type YoudaoAccent,
} from '../utils/helper';
import { ChevronIcon } from './icons/ReaderIcons';
import Tips, { DefaultSpeechSwitch, getSpeechAccentLabel, getSpeechAccentTitle } from './Tips';
import PronunciationAudioRow from './PronunciationAudioRow';
import '../styles/tailwind.css';

interface DictionaryProps {
  selectedWord?: string | null;
  mobileExpanded?: boolean;
  onMobileExpandedChange?: (expanded: boolean) => void;
  mobileExpandButtonClassName?: string;
  mobileContentHeightClassName?: string;
}

type DictionaryLanguage = 'en' | 'zh';

const Dictionary: React.FC<DictionaryProps> = ({
  selectedWord,
  mobileExpanded,
  onMobileExpandedChange,
  mobileExpandButtonClassName = 'md:hidden',
  mobileContentHeightClassName,
}) => {
  const [result, setResult] = useState<DictResponse | null>(null);
  const [internalMobileExpanded, setInternalMobileExpanded] = useState(false);
  const [preferredPhonetic, setPreferredPhonetic] = useState<YoudaoAccent>(() => getStoredPreferredPhonetic());
  const { lookupWord, loading, error } = useDictionary();
  const { speak } = useTTS();
  const { locale } = useLocaleContext();
  const lastAutoPlayedWordRef = useRef<string | null>(null);
  const language: DictionaryLanguage = locale === 'zh' ? 'zh' : 'en';
  const sfDisplay = '"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const sfText = '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const showTips = !selectedWord && !result && !loading && !error;
  const cardClassName = 'rounded-[12px] bg-white1 p-2 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]';
  const sectionClassName = 'rounded-[8px] bg-[#f5f5f7] p-3';
  const dictionaryPhonetics = result?.phonetics
    .map((phonetic) => phonetic.text?.trim())
    .filter((phonetic): phonetic is string => Boolean(phonetic))
    .slice(0, 2) ?? [];
  const pronunciationEntries = (['uk', 'us'] as YoudaoAccent[]).map((accent, index) => ({
    accent,
    phonetic: dictionaryPhonetics[index],
  }));
  const isMobileExpanded = mobileExpanded ?? internalMobileExpanded;
  const mobileContentClassName = mobileContentHeightClassName
    ?? (isMobileExpanded ? 'h-[70dvh] md:h-auto' : 'h-[35dvh] md:h-auto');

  const handlePlayYoudaoAudio = useCallback((word: string, accent: YoudaoAccent) => {
    void playYoudaoAudio(word, accent).catch((playbackError: unknown) => {
      console.error('Failed to play dictionary audio:', playbackError);
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
  }, [mobileExpanded, selectedWord]);

  useEffect(() => {
    if (!selectedWord) {
      lastAutoPlayedWordRef.current = null;
      return;
    }

    lookupWord(selectedWord)
      .then(async data => {
        setResult(data);

        if (lastAutoPlayedWordRef.current === selectedWord) {
          return;
        }

        handlePlayYoudaoAudio(data.word, preferredPhonetic);
        lastAutoPlayedWordRef.current = selectedWord;
      })
      .catch(err => console.error('Failed to look up word:', err));
  }, [handlePlayYoudaoAudio, lookupWord, preferredPhonetic, selectedWord]);

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
          {locale === 'zh' ? '词典' : 'Dictionary'}
        </div>
        <button
          type="button"
          onClick={() => handleMobileExpandedChange(!isMobileExpanded)}
          className={`inline-flex h-8 w-32 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 ${mobileExpandButtonClassName}`}
          aria-label={isMobileExpanded ? 'Collapse dictionary panel' : 'Expand dictionary panel'}
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
      {error && (
        <div
          className="rounded-[12px] bg-white p-4 text-[#8b2b1d] shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
        >
          {error}
        </div>
      )}

      {showTips && (
        <div className={cardClassName}>
          <Tips />
        </div>
      )}

      {result && (
        <div className="">
          <div className={`${cardClassName}`}>
            <div className="flex flex-col gap-2">
              <div>
                <h3
                  className="text-[28px] font-semibold text-[#1d1d1f]"
                  style={{ fontFamily: sfDisplay, letterSpacing: '0.196px', lineHeight: '1.14' }}
                >
                  {result.word}
                </h3>
              </div>
              <PronunciationAudioRow
                word={result.word}
                locale={locale}
                entries={pronunciationEntries}
                onPlay={handlePlayYoudaoAudio}
                style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
              />
            </div>
          </div>

          {result.meanings.map((meaning, index) => (
            <div key={index} className={`mb-2 ${cardClassName}`}>
              <div className={`${sectionClassName} mb-3`}>
                <p
                  className="text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '词性' : 'Part of speech'}
                </p>
                <h3
                  className="mt-1 text-[17px] font-semibold text-[#1d1d1f]"
                  style={{ fontFamily: sfText, letterSpacing: '-0.374px', lineHeight: '1.47' }}
                >
                  {meaning.partOfSpeech}
                </h3>
              </div>

              <div className={`${sectionClassName} mb-3`}>
                <p
                  className="mb-1 text-[12px] font-semibold uppercase text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {locale === 'zh' ? '释义' : 'Definitions'}
                </p>
                <ul className="space-y-2">
                {meaning.definitions.map((def, defIndex) => (
                  <li key={defIndex}>
                    <div className="flex-1">
                      {language === 'en' ? (
                        <p
                          className="text-[17px] text-black/80"
                          style={{ fontFamily: sfText, letterSpacing: '-0.374px', lineHeight: '1.47' }}
                        >
                          {defIndex + 1}. {def.definition}
                        </p>
                      ) : def.translation ? (
                        <p
                          className="text-[17px] text-black/80"
                          style={{ fontFamily: sfText, letterSpacing: '-0.374px', lineHeight: '1.47' }}
                        >
                          {defIndex + 1}. {def.translation}
                        </p>
                      ) : (
                        <p
                          className="text-[14px] text-black/40"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          {defIndex + 1}. {locale === 'zh' ? '暂无中文释义。' : 'No Chinese definition available.'}
                        </p>
                      )}
                      {def.example && (
                        <p
                          className="mt-2 flex items-center justify-between gap-2 rounded-[8px] bg-white/70 p-3 text-[14px] italic text-black/64"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          <span>{def.example}</span>
                          <button
                            onClick={() => def.example && speak(def.example)}
                            className="ml-2 rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1.5 text-[14px] text-[#0066cc] transition-colors hover:underline"
                            style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                            title={locale === 'zh' ? '朗读例句' : 'Listen to example'}
                          >
                            🔊
                          </button>
                        </p>
                      )}
                      {def.synonyms.length > 0 && (
                        <p
                          className="mt-2 text-[14px] text-black/64"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          <span className="font-medium">{locale === 'zh' ? '近义词: ' : 'Synonyms: '}</span>
                          <span className="text-[#0066cc]">{def.synonyms.join(', ')}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              </div>

              {meaning.synonyms.length > 0 && (
                <div
                  className={`${sectionClassName} text-[14px]`}
                  style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                >
                  <span className="font-medium text-black/72">{locale === 'zh' ? '近义词: ' : 'Synonyms: '}</span>
                  <span className="text-[#0066cc]">{meaning.synonyms.join(', ')}</span>
                </div>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
    </>
  );
};

export default Dictionary;
