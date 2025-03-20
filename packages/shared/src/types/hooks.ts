import { Article, WordList, DictResponse } from './index';

export interface UseArticlesResult {
  articles: Article[];
  loading: boolean;
  error: Error | null;
  total: number;
  fetchArticles: (page: number, perPage: number) => Promise<void>;
  createArticle: (url: string) => Promise<Article>;
  deleteArticle: (id: string) => Promise<void>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<Article>;
}

export interface UseWordListsResult {
  wordLists: WordList[];
  loading: boolean;
  error: Error | null;
  createWordList: (name: string) => Promise<WordList>;
  deleteWordList: (id: string) => Promise<void>;
  updateWordList: (id: string, data: Partial<WordList>) => Promise<WordList>;
  addWord: (listId: string, word: string) => Promise<void>;
  removeWord: (listId: string, word: string) => Promise<void>;
}

export interface UseDictionaryResult {
  loading: boolean;
  error: Error | null;
  lookupWord: (word: string) => Promise<DictResponse>;
  getExpressions: (word: string) => Promise<string[]>;
}

export interface UseArticleReaderResult {
  currentParagraph: string;
  selectedText: string;
  setSelectedText: (text: string) => void;
  nextParagraph: () => void;
  previousParagraph: () => void;
  currentParagraphIndex: number;
  totalParagraphs: number;
  addWord: (word: string) => Promise<void>;
}