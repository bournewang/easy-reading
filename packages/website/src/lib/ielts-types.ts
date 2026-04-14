export type IELTSArticleResource = {
  id: string;
  title: string;
  content: string;
  source: string;
  level: string;
  category: string;
  publishedAt?: string;
  wordCount: number;
  readingTime: number;
  year: string;
  month: string;
  test: string;
  passage: string;
};

export type IELTSArticleManifestItem = Omit<IELTSArticleResource, 'content'>;

export type IELTSArticleListItem = {
  id: string;
  title: string;
  source: string;
  year: string;
  month: string;
  test: string;
  passage: string;
  order: number;
  readingTime: number;
  wordCount: number;
  url: string;
};

export type IELTSReaderTestSummary = {
  year: string;
  month: string;
  test: string;
  source: string;
  articleCount: number;
  url: string;
};
