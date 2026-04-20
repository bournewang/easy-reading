'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useLocaleContext } from '../contexts/LocaleContext';
import type { VocabularyBookWordDetails } from '../types/vocabularyBook';

interface VocabularyBookPanelProps {
  selectedWord?: string | null;
  details: VocabularyBookWordDetails[];
}

export default function VocabularyBookPanel({ selectedWord, details }: VocabularyBookPanelProps) {
  const { locale } = useLocaleContext();
  const lastAutoPlayedKeyRef = useRef<string | null>(null);
  const sfDisplay = '"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const sfText = '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const playYoudaoAudio = useCallback((speech: string | undefined, fallbackWord: string) => {
    const rawSpeech = (speech || '').trim();
    const rawFallbackWord = fallbackWord.trim();
    const payload = rawSpeech || rawFallbackWord;
    if (!payload) {
      return;
    }

    const url = rawSpeech
      ? `https://dict.youdao.com/dictvoice?audio=${rawSpeech}`
      : `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(rawFallbackWord)}`;
    const audio = new Audio(url);
    void audio.play().catch((error) => {
      console.error('Failed to play vocabulary audio:', error);
    });
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

    // Auto-play US speech first; if missing, use UK speech.
    playYoudaoAudio(first.usSpeech || first.ukSpeech, first.headWord);
    lastAutoPlayedKeyRef.current = autoPlayKey;
  }, [details, playYoudaoAudio, selectedWord]);

  const hasDetails = details.length > 0;

  return (
    <>
      <div
        className="sticky top-0 z-10 border-b border-black/6 bg-white py-3 text-center text-[12px] font-semibold uppercase text-black/56"
        style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
      >
        {locale === 'zh' ? '单词释义' : 'Vocabulary Details'}
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
                  <span
                    className="rounded-full border border-black/10 bg-[#fafafc] px-2 py-0.5 text-[10px] font-semibold uppercase text-black/52"
                    style={{ fontFamily: sfText, letterSpacing: '-0.08px', lineHeight: '1.47' }}
                  >
                    {item.bookId.replace(/\.json$/i, '')}
                  </span>
                </div>
                <p
                  className="mt-1 text-[12px] text-black/48"
                  style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
                >
                  {[item.ukPhone ? `UK ${item.ukPhone}` : '', item.usPhone ? `US ${item.usPhone}` : '']
                    .filter(Boolean)
                    .join('  ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playYoudaoAudio(item.ukSpeech, item.headWord)}
                  className="rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1.5 text-[14px] font-normal text-[#0066cc] transition-colors hover:underline"
                  style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                  title={locale === 'zh' ? '英式发音' : 'British pronunciation'}
                >
                  UK
                </button>
                <button
                  onClick={() => playYoudaoAudio(item.usSpeech, item.headWord)}
                  className="rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1.5 text-[14px] font-normal text-[#0066cc] transition-colors hover:underline"
                  style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                  title={locale === 'zh' ? '美式发音' : 'US pronunciation'}
                >
                  US
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
