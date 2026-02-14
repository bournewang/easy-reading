import { useState, useCallback, useEffect } from 'react';

// No need to redeclare chrome, just augment Window interface
// declare global {
//   interface Window {
//     chrome: Chrome;
//   }
// }

const STORAGE_KEY = 'english_reader_wordlist';

const saveToStorage = async (words: Set<string>) => {
  const wordArray = Array.from(words);
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: wordArray });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wordArray));
  }
};

const getFromStorage = async (): Promise<string[]> => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } else {
    const storedWords = localStorage.getItem(STORAGE_KEY);
    return storedWords ? JSON.parse(storedWords) : [];
  }
};

export const useWordList = () => {
  const [words, setWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFromStorage().then(wordArray => {
      setWords(new Set(wordArray));
    });
  }, []);

  useEffect(() => {
    if (words.size > 0) {
      saveToStorage(words);
    }
  }, [words]);

  const addWord = useCallback(async (word: string) => {
    setWords(prev => new Set([...prev, word]));
  }, []);

  const removeWord = useCallback(async (word: string) => {
    setWords(prev => {
      const next = new Set(prev);
      next.delete(word);
      return next;
    });
  }, []);

  const isKnownWord = useCallback((word: string) => {
    return words.has(word.toLowerCase());
  }, [words]);

  return {
    words,
    addWord,
    removeWord,
    isKnownWord
  };
};