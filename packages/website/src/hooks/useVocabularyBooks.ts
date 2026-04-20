'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getVocabBookSettings, replaceVocabBookSettings } from '@/lib/api/vocab-book-settings';
import {
  buildReaderVocabularyData,
  fetchVocabularyBookIndex,
  fetchVocabularyBookWordDetails,
} from '@/lib/vocabulary-books';
import type { ReaderVocabularyData, ReaderVocabularyWordDetails, VocabularyBookCatalogItem } from '@/types/vocabulary-books';

const LOCAL_STORAGE_KEY = 'easy_reading_vocab_book_ids';

function normalizeBookIds(bookIds: string[]) {
  return Array.from(new Set(bookIds.map((id) => id.trim()).filter(Boolean)));
}

function getLocalBookIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeBookIds(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return [];
  }
}

function saveLocalBookIds(bookIds: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizeBookIds(bookIds)));
}

function clearLocalBookIds() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function useVocabularyBooks(options?: { loadWordDetails?: boolean }) {
  const loadWordDetails = options?.loadWordDetails === true;
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<VocabularyBookCatalogItem[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [detailsByBookId, setDetailsByBookId] = useState<Record<string, ReaderVocabularyWordDetails[]>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const items = await fetchVocabularyBookIndex();
        if (!cancelled) {
          setCatalog(items);
        }
      } catch (error) {
        console.error('Failed to load vocabulary book index:', error);
      } finally {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSelection = async () => {
      try {
        setLoadingSelection(true);

        if (!user) {
          if (!cancelled) {
            setSelectedBookIds(getLocalBookIds());
          }
          return;
        }

        const localBookIds = getLocalBookIds();
        const remoteBookIds = normalizeBookIds(await getVocabBookSettings());

        let next = remoteBookIds;
        if (localBookIds.length > 0 && remoteBookIds.length === 0) {
          next = normalizeBookIds(await replaceVocabBookSettings(localBookIds));
          clearLocalBookIds();
        }

        if (!cancelled) {
          setSelectedBookIds(next);
        }
      } catch (error) {
        console.error('Failed to load selected vocabulary books:', error);
        if (!user && !cancelled) {
          setSelectedBookIds(getLocalBookIds());
        }
      } finally {
        if (!cancelled) {
          setLoadingSelection(false);
        }
      }
    };

    void loadSelection();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveSelection = useCallback(
    async (bookIds: string[]) => {
      const normalized = normalizeBookIds(bookIds);
      setSavingSelection(true);
      try {
        if (!user) {
          saveLocalBookIds(normalized);
          setSelectedBookIds(normalized);
          return normalized;
        }

        const updated = normalizeBookIds(await replaceVocabBookSettings(normalized));
        setSelectedBookIds(updated);
        return updated;
      } finally {
        setSavingSelection(false);
      }
    },
    [user],
  );

  const toggleBookSelection = useCallback(
    async (bookId: string) => {
      let normalized: string[];
      
      if (selectedBookIds.includes(bookId)) {
        // Remove the book
        normalized = normalizeBookIds(selectedBookIds.filter((id) => id !== bookId));
      } else {
        // Add the book (limit to max 3)
        if (selectedBookIds.length >= 3) {
          // If already at max, don't add more
          return selectedBookIds;
        }
        normalized = normalizeBookIds([...selectedBookIds, bookId]);
      }

      return saveSelection(normalized);
    },
    [saveSelection, selectedBookIds],
  );

  useEffect(() => {
    if (!loadWordDetails) {
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      const next: Record<string, ReaderVocabularyWordDetails[]> = {};

      for (const bookId of selectedBookIds) {
        const title = catalog.find((item) => item.id === bookId)?.title || bookId;
        try {
          next[bookId] = await fetchVocabularyBookWordDetails(bookId, title);
        } catch (error) {
          console.error(`Failed to load vocabulary book content: ${bookId}`, error);
          next[bookId] = [];
        }
      }

      if (!cancelled) {
        setDetailsByBookId(next);
      }
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [catalog, loadWordDetails, selectedBookIds]);

  const catalogById = useMemo(() => {
    return catalog.reduce<Record<string, VocabularyBookCatalogItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [catalog]);

  const readerVocabularyData: ReaderVocabularyData = useMemo(() => {
    if (!loadWordDetails) {
      return {
        vocabularyHighlightColorByWord: {},
        vocabularyBookIdsByWord: {},
        vocabularyWordDetailsByWord: {},
      };
    }

    return buildReaderVocabularyData(selectedBookIds, catalogById, detailsByBookId);
  }, [catalogById, detailsByBookId, loadWordDetails, selectedBookIds]);

  return {
    catalog,
    selectedBookIds,
    loadingCatalog,
    loadingSelection,
    savingSelection,
    saveSelection,
    toggleBookSelection,
    readerVocabularyData,
  };
}
