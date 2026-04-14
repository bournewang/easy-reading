import { useState, useCallback, useEffect } from 'react';
import { useSharedServices } from '../contexts/SharedServicesContext';

const STORAGE_KEY = 'english_reader_wordlist';

export const useWordList = () => {
  const [words, setWords] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const { storage } = useSharedServices();

  useEffect(() => {
    storage.get<string[]>(STORAGE_KEY, []).then(wordArray => {
      setWords(new Set(wordArray));
      setHasLoaded(true);
    });
  }, [storage]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const wordArray = Array.from(words);
    if (wordArray.length > 0) {
      storage.set(STORAGE_KEY, wordArray);
    } else {
      storage.remove(STORAGE_KEY);
    }
  }, [hasLoaded, storage, words]);

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
