export interface VocabularyBookExample {
  en: string;
  cn?: string;
}

export interface VocabularyBookPhrase {
  text: string;
  cn?: string;
}

export interface VocabularyBookWordDetails {
  bookId: string;
  bookTitle: string;
  headWord: string;
  ukPhone?: string;
  usPhone?: string;
  ukSpeech?: string;
  usSpeech?: string;
  explanation: string[];
  examples: VocabularyBookExample[];
  phrases: VocabularyBookPhrase[];
}
