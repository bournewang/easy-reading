'use client';

import React, { useState, useEffect } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import type { DictResponse } from '../types/dictionary';
import { useTTS } from '../hooks/useTTS';
import '../styles/tailwind.css';

interface DictionaryProps {
  selectedWord?: string | null;
}

type DictionaryLanguage = 'en' | 'zh';

const Dictionary: React.FC<DictionaryProps> = ({ selectedWord }) => {
  const [word, setWord] = useState('');
  const [result, setResult] = useState<DictResponse | null>(null);
  const [language, setLanguage] = useState<DictionaryLanguage>('en');
  const { lookupWord, loading, error } = useDictionary();
  const { speak } = useTTS();

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
    <div className="sticky top-0 text-xs text-slate-500 text-center border-b border-t border-slate-200 py-1 bg-white z-1">
        Dictionary
    </div>
    <div className="p-2 md:p-4 bg-slate-100 md:bg-slate-50 shadow-lg">
      <div className='hidden md:block'>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Enter a word to look up"
              className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
            <button
              type="submit"
              className="px-3 py-2 text-white rounded-lg disabled:bg-slate-300 transition-colors duration-200"
              disabled={loading || !word.trim()}
              title="Look up word"
            >
              <span className={loading ? 'inline-block animate-spin-slow' : ''}>
                {loading ? '⏳' : '🔍'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-2 mb-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="">
          <div className="mb-2 md:mb-4">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <h2 className="text-2xl font-bold text-slate-800 whitespace-nowrap">{result.word}</h2>
              {result.phonetics
                .filter(phonetic => phonetic.text && phonetic.audio)
                .map((phonetic, index) => (
                  <div key={index} className="flex items-center space-x-2 whitespace-nowrap">
                    <span className="text-slate-600">{phonetic.text}</span>
                    <button
                      onClick={() => new Audio(phonetic.audio).play()}
                      className="p-1 text-indigo-600 hover:text-indigo-700"
                    >
                      🔊
                    </button>
                  </div>
                ))}
            </div>

            <div className="mt-3 flex justify-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('zh')}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    language === 'zh' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chinese
                </button>
              </div>
            </div>
          </div>

          {result.meanings.map((meaning, index) => (
            <div key={index} className="mb-2 md:mb-4 p-1 md:p-3 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-indigo-600 mb-1 md:mb-2">
                {meaning.partOfSpeech}
              </h3>

              <ul className="list-none list-inside space-y-1 md:space-y-2">
                {meaning.definitions.map((def, defIndex) => (
                  <li key={defIndex} className="text-slate-700">
                    <div className="flex-1">
                      {language === 'en' ? (
                        <p>{defIndex + 1}. {def.definition}</p>
                      ) : def.translation ? (
                        <p className="text-slate-700">
                          {defIndex + 1}. {def.translation}
                        </p>
                      ) : (
                        <p className="rounded-lg bg-slate-50 p-2 text-slate-400">
                          {defIndex + 1}. No Chinese definition available.
                        </p>
                      )}
                      {def.example && (
                        <p className="mt-1 text-slate-600 italic bg-slate-50 p-2 rounded-lg flex items-center justify-between">
                          <span>{def.example}</span>
                          <button
                            onClick={() => def.example && speak(def.example)}
                            className="p-1 text-indigo-600 hover:text-indigo-700 ml-2"
                            title="Listen to example"
                          >
                            🔊
                          </button>
                        </p>
                      )}
                      {def.synonyms.length > 0 && (
                        <p className="mt-1 text-slate-600">
                          <span className="font-medium">Synonyms: </span>
                          <span className="text-indigo-600">{def.synonyms.join(', ')}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {meaning.synonyms.length > 0 && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Synonyms: </span>
                  <span className="text-indigo-600">{meaning.synonyms.join(', ')}</span>
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
