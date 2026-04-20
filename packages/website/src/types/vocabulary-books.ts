import type { VocabularyBookWordDetails } from '@easy-reading/shared';

export interface VocabularyBookCatalogItem {
  id: string;
  title: string;
  image: string;
  wordCount: number;
  tags: string[];
}

export type ReaderVocabularyWordDetails = VocabularyBookWordDetails;

export interface ReaderVocabularyData {
  vocabularyHighlightColorByWord: Record<string, string>;
  vocabularyBookIdsByWord: Record<string, string[]>;
  vocabularyWordDetailsByWord: Record<string, ReaderVocabularyWordDetails[]>;
}
