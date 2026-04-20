'use client';

import React, { useState, useEffect } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import type { DictResponse } from '../types/dictionary';
import { useTTS } from '../hooks/useTTS';
import { useLocaleContext } from '../contexts/LocaleContext';
import '../styles/tailwind.css';

interface DictionaryProps {
  selectedWord?: string | null;
}

type DictionaryLanguage = 'en' | 'zh';

const Dictionary: React.FC<DictionaryProps> = ({ selectedWord }) => {
  const [word, setWord] = useState('');
  const [result, setResult] = useState<DictResponse | null>(null);
  const { lookupWord, loading, error } = useDictionary();
  const { speak } = useTTS();
  const { locale } = useLocaleContext();
  const language: DictionaryLanguage = locale === 'zh' ? 'zh' : 'en';
  const sfDisplay = '"SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const sfText = '"SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif';

  useEffect(() => {
    if (selectedWord) {
      setWord(selectedWord);
      lookupWord(selectedWord)
        .then(async data => {
          setResult(data);

          const firstPhonetic = data.phonetics.find(p => p.text && p.audio);
          if (firstPhonetic?.audio) {
            new Audio(firstPhonetic.audio).play();
          } else {
            speak(data.word);
          }
        })
        .catch(err => console.error('Failed to look up word:', err));
    }
  }, [selectedWord, lookupWord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    try {
      const data = await lookupWord(word);
      setResult(data);
    } catch (err) {
      console.error('Failed to look up word:', err);
    }
  };

  return (
    <>
    <div
      className="sticky top-0 z-10 border-b border-black/6 bg-white py-3 text-center text-[12px] font-semibold uppercase text-black/56"
      style={{ fontFamily: sfText, letterSpacing: '-0.12px', lineHeight: '1.33' }}
    >
        {locale === 'zh' ? '词典' : 'Dictionary'}
    </div>
    <div className="bg1-[#f5f5f7] p-3 md:p-4 xl:h-full xl:overflow-y-auto">
      <div className='hidden md:block'>
        <form onSubmit={handleSubmit} className="mb-4 rounded-[12px] bg-white p-3 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
          <div className="flex gap-2">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={locale === 'zh' ? '输入要查询的单词' : 'Enter a word to look up'}
              className="flex-1 rounded-[11px] border border-black/10 bg-[#fafafc] px-4 py-3 text-[17px] text-[#1d1d1f] focus:border-[#0071e3] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              style={{ fontFamily: sfText, letterSpacing: '-0.374px', lineHeight: '1.47' }}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-[980px] border border-[#0071e3] bg-[#0071e3] px-4 py-2 text-[14px] font-normal text-white transition-colors duration-200 hover:bg-[#0066cc] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
              style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
              disabled={loading || !word.trim()}
              title={locale === 'zh' ? '查询单词' : 'Look up word'}
            >
              <span className={loading ? 'inline-block animate-spin-slow' : ''}>
                {loading ? '⏳' : '🔍'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div
          className="mb-4 rounded-[12px] bg-white p-3 text-[#8b2b1d] shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
        >
          {error}
        </div>
      )}

      {result && (
        <div className="">
          <div className=" rounded-[12px] bg-white p-2 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
            <div className="flex flex-wrap items-start justify-start gap-x-3 gap-y-2">
              <h3
                className="whitespace-nowrap text-[28px] font-semibold text-[#1d1d1f]"
                style={{ fontFamily: sfDisplay, letterSpacing: '-0.28px', lineHeight: '1.1' }}
              >
                {result.word}
              </h3>
              {result.phonetics
                .filter(phonetic => phonetic.text && phonetic.audio)
                .map((phonetic, index) => (
                  <div key={index} className="flex items-center space-x-2 whitespace-nowrap">
                    {/* <span
                      className="text-[14px] text-black/64"
                      style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                    >
                      {phonetic.text}
                    </span> */}
                    <button
                      onClick={() => new Audio(phonetic.audio).play()}
                      className="rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1 text-[14px] text-[#0066cc] transition-colors hover:underline"
                      style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                    >
                      🔊
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {result.meanings.map((meaning, index) => (
            <div key={index} className="mb-4 rounded-[12px] bg-white p-4 shadow1-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
              <h3
                className="mb-2 text-[21px] font-semibold text-[#0066cc]"
                style={{ fontFamily: sfDisplay, letterSpacing: '0.231px', lineHeight: '1.19' }}
              >
                {meaning.partOfSpeech}
              </h3>

              <ul className="list-none list-inside space-y-1 md:space-y-2">
                {meaning.definitions.map((def, defIndex) => (
                  <li key={defIndex} className="text-slate-700">
                    <div className="flex-1">
                      {language === 'en' ? (
                        <p
                          className="text-[15px] text-black/80"
                          style={{ fontFamily: sfText, letterSpacing: '-0.24px', lineHeight: '1.5' }}
                        >
                          {defIndex + 1}. {def.definition}
                        </p>
                      ) : def.translation ? (
                        <p
                          className="text-[15px] text-black/80"
                          style={{ fontFamily: sfText, letterSpacing: '-0.24px', lineHeight: '1.5' }}
                        >
                          {defIndex + 1}. {def.translation}
                        </p>
                      ) : (
                        <p
                          className="rounded-[8px] bg-[#f5f5f7] p-2 text-[14px] text-black/40"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          {defIndex + 1}. {locale === 'zh' ? '暂无中文释义。' : 'No Chinese definition available.'}
                        </p>
                      )}
                      {def.example && (
                        <p
                          className="mt-2 flex items-center justify-between rounded-[8px] bg-[#f5f5f7] p-3 text-[14px] italic text-black/64"
                          style={{ fontFamily: sfText, letterSpacing: '-0.224px', lineHeight: '1.43' }}
                        >
                          <span>{def.example}</span>
                          <button
                            onClick={() => def.example && speak(def.example)}
                            className="ml-2 rounded-[980px] border border-[#0066cc] bg-transparent px-3 py-1 text-[14px] text-[#0066cc] transition-colors hover:underline"
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

              {meaning.synonyms.length > 0 && (
                <div
                  className="mt-3 rounded-[8px] bg-[#f5f5f7] p-3 text-[14px]"
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
