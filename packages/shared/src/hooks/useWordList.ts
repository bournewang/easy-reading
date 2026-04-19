'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSharedServices } from '../contexts/SharedServicesContext';

const STORAGE_KEY = 'english_reader_wordlist';
const AUTH_CHANGED_EVENT = 'easy-reading-auth-changed';
const AUTH_TOKEN_STORAGE_KEY = 'easy_reading_auth_token';
const ANONYMOUS_LIMITS_STORAGE_KEY = 'easy_reading_anonymous_limits';
const DEFAULT_WORDBOOK_LIMIT = 100;

function normalizeWords(wordArray: string[]) {
  return Array.from(new Set(wordArray.map((word) => word.trim().toLowerCase()).filter(Boolean)));
}

function getAnonymousWordbookLimit() {
  if (typeof window === 'undefined') {
    return DEFAULT_WORDBOOK_LIMIT;
  }

  const raw = window.localStorage.getItem(ANONYMOUS_LIMITS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_WORDBOOK_LIMIT;
  }

  try {
    const parsed = JSON.parse(raw) as { wordbookLimit?: number };
    return Math.max(1, parsed.wordbookLimit || DEFAULT_WORDBOOK_LIMIT);
  } catch {
    return DEFAULT_WORDBOOK_LIMIT;
  }
}

function hasAuthToken() {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
}

export const useWordList = () => {
  const [words, setWords] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const { storage } = useSharedServices();
  const wordsRef = useRef<Set<string>>(new Set());

  const loadWords = useCallback(async () => {
    const wordArray = normalizeWords(await storage.get<string[]>(STORAGE_KEY, []));
    const nextWords = new Set(wordArray);
    wordsRef.current = nextWords;
    setWords(nextWords);
    setHasLoaded(true);
  }, [storage]);

  useEffect(() => {
    void loadWords();

    if (typeof window === 'undefined') {
      return;
    }

    const handleAuthChanged = () => {
      void loadWords();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [loadWords]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const addWord = useCallback(async (word: string) => {
    const normalized = word.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const currentWords = Array.from(wordsRef.current);
    const nextWords = currentWords.filter((item) => item !== normalized);
    nextWords.push(normalized);

    const nextSet = new Set(
      !hasAuthToken() ? nextWords.slice(-getAnonymousWordbookLimit()) : nextWords,
    );

    wordsRef.current = nextSet;
    setWords(nextSet);

    try {
      if (storage.addToList) {
        await storage.addToList(STORAGE_KEY, normalized);
      } else {
        await storage.set(STORAGE_KEY, Array.from(nextSet));
      }
    } catch (error) {
      console.error('Failed to add word to wordbook:', error);
      void loadWords();
    }
  }, [loadWords, storage]);

  const removeWord = useCallback(async (word: string) => {
    const normalized = word.trim().toLowerCase();
    const nextSet = new Set(wordsRef.current);
    nextSet.delete(normalized);

    wordsRef.current = nextSet;
    setWords(nextSet);

    try {
      if (storage.removeFromList) {
        await storage.removeFromList(STORAGE_KEY, normalized);
      } else if (nextSet.size > 0) {
        await storage.set(STORAGE_KEY, Array.from(nextSet));
      } else {
        await storage.remove(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to remove word from wordbook:', error);
      void loadWords();
    }
  }, [loadWords, storage]);

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
