import { Keyword, KeywordLevel, KeywordCategory } from '@/types';

export interface IELTSVocabulary {
  id: number;
  word: string;
  meaning: string;
  example: string;
  ielts_level: string;
}

// Load IELTS vocabulary from JSON file
export const ieltsVocabulary: IELTSVocabulary[] = require('./ielts_vocabulary.json');

// Convert IELTS vocabulary to Keyword format for highlighting
export function getKeywordsFromVocabulary(): Keyword[] {
  return ieltsVocabulary.map(vocab => ({
    id: `vocab-${vocab.id}`,
    word: vocab.word,
    phonetic: undefined,
    definition: vocab.meaning,
    examples: [vocab.example],
    level: mapIELTSLevelToKeywordLevel(vocab.ielts_level),
    category: 'IELTS' as KeywordCategory,
  }));
}

// Map IELTS band levels to KeywordLevel
function mapIELTSLevelToKeywordLevel(band: string): KeywordLevel {
  if (band.includes('Band 8-9') || band.includes('Band 9')) return 'C2';
  if (band.includes('Band 7-8')) return 'C1';
  if (band.includes('Band 6-7')) return 'B2';
  if (band.includes('Band 5-6')) return 'B1';
  if (band.includes('Band 4-5')) return 'A2';
  if (band.includes('Band 3-4')) return 'A1';
  return 'IELTS';
}

// Build a quick lookup map for vocabulary
export const vocabularyMap = new Map<string, IELTSVocabulary>();
ieltsVocabulary.forEach(vocab => {
  vocabularyMap.set(vocab.word.toLowerCase(), vocab);
});

// Get vocabulary entry by word
export function getVocabularyByWord(word: string): IELTSVocabulary | undefined {
  return vocabularyMap.get(word.toLowerCase());
}

// Get all vocabulary words as a Set for quick lookup
export const vocabularyWords = new Set<string>(
  ieltsVocabulary.map(v => v.word.toLowerCase())
);
