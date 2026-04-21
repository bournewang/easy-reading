import type { ReaderVocabularyData, ReaderVocabularyWordDetails, VocabularyBookCatalogItem } from '@/types/vocabulary-books';
import vocabularyBooksIndex from '../../vocabulary-books/index.json';

const BOOK_HIGHLIGHT_COLORS = [
  'rgba(255, 232, 171, 0.75)',
  'rgba(198, 238, 255, 0.75)',
  'rgba(213, 247, 203, 0.75)',
  'rgba(247, 214, 253, 0.75)',
  'rgba(255, 213, 213, 0.75)',
  'rgba(220, 226, 255, 0.75)',
  'rgba(255, 232, 196, 0.75)',
  'rgba(208, 244, 243, 0.75)',
];

type RawBookLine = {
  headWord?: string;
  bookId?: string;
  content?: {
    word?: {
      wordHead?: string;
      content?: {
        usphone?: string;
        ukphone?: string;
        usspeech?: string;
        ukspeech?: string;
        phone?: string;
        trans?: Array<{ tranCn?: string; tranOther?: string }>;
        sentence?: {
          sentences?: Array<{ sContent?: string; sCn?: string }>;
        };
        phrase?: {
          phrases?: Array<{ pContent?: string; pCn?: string }>;
        };
      };
    };
  };
};

function uniqStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function inferVocabularyBookTags(title: string, file: string) {
  const source = `${title} ${file}`;
  const tags: string[] = [];

  if (/小学|XiaoXue/i.test(source)) {
    tags.push('primary-school');
  }
  if (/初中|中考|ChuZhong/i.test(source)) {
    tags.push('middle-school');
  }
  if (/高中|高考|GaoZhong/i.test(source)) {
    tags.push('high-school');
  }
  if (/四级|CET4/i.test(source)) {
    tags.push('cet4');
  }
  if (/六级|CET6/i.test(source)) {
    tags.push('cet6');
  }
  if (/雅思|IELTS/i.test(source)) {
    tags.push('ielts');
  }
  if (/TOEFL/i.test(source)) {
    tags.push('toefl');
  }
  if (/GRE/i.test(source)) {
    tags.push('gre');
  }
  if (/SAT/i.test(source)) {
    tags.push('sat');
  }
  if (/GMAT/i.test(source)) {
    tags.push('gmat');
  }
  if (/考研|KaoYan/i.test(source)) {
    tags.push('postgraduate');
  }
  if (/专四|Level4/i.test(source)) {
    tags.push('tem4');
  }
  if (/专八|Level8/i.test(source)) {
    tags.push('tem8');
  }
  if (/BEC/i.test(source)) {
    tags.push('bec');
  }

  return uniqStrings(tags.length > 0 ? tags : ['other']);
}

async function fetchFromVocabularyBooks(filename: string): Promise<string> {
  const url = `/vocabulary-books/${filename}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.text();
}

function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImageUrl(imageMarkdown: string) {
  const match = imageMarkdown.match(/\((https?:\/\/[^)]+)\)/i);
  return match?.[1] || '';
}

function parseTags(rawTags: string) {
  return rawTags
    .split(/[、,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function splitMarkdownRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) {
    return [];
  }

  const columns = trimmed.split('|').slice(1, -1).map((part) => part.trim());
  return columns;
}

export async function fetchVocabularyBookIndex(): Promise<VocabularyBookCatalogItem[]> {
  const items = parseVocabularyBookIndexFromJson(vocabularyBooksIndex);
  if (items.length === 0) {
    throw new Error('Vocabulary index is empty');
  }

  return items;
}

function parseVocabularyBookIndexFromJson(items: Array<{
  index?: number;
  coverImg?: string;
  title?: string;
  file?: string;
  wordCount: number;
}>): VocabularyBookCatalogItem[] {
  return items
    .filter((item) => item.title && item.file)
    .map((item) => ({
      id: item.file || '',
      title: item.title || '',
      image: item.coverImg || '',
      wordCount: item.wordCount || 0,
      tags: inferVocabularyBookTags(item.title || '', item.file || ''),
    }));
}

function normalizeWordDetails(raw: RawBookLine, bookTitle: string): ReaderVocabularyWordDetails | null {
  const headWord = (raw.headWord || raw.content?.word?.wordHead || '').trim();
  if (!headWord) {
    return null;
  }

  const content = raw.content?.word?.content;
  const trans = content?.trans || [];
  const explanation = uniqStrings(
    trans
      .flatMap((item) => [item?.tranCn || '', item?.tranOther || ''])
      .filter(Boolean),
  );

  const examples = (content?.sentence?.sentences || [])
    .map((item) => ({ en: (item?.sContent || '').trim(), cn: (item?.sCn || '').trim() || undefined }))
    .filter((item) => item.en);

  const phrases = (content?.phrase?.phrases || [])
    .map((item) => ({ text: (item?.pContent || '').trim(), cn: (item?.pCn || '').trim() || undefined }))
    .filter((item) => item.text);

  return {
    bookId: String(raw.bookId || '').trim(),
    bookTitle,
    headWord,
    ukPhone: (content?.ukphone || '').trim() || undefined,
    usPhone: (content?.usphone || '').trim() || undefined,
    ukSpeech: (content?.ukspeech || '').trim() || undefined,
    usSpeech: (content?.usspeech || '').trim() || undefined,
    explanation,
    examples,
    phrases,
  };
}

export async function fetchVocabularyBookWordDetails(bookId: string, bookTitle: string): Promise<ReaderVocabularyWordDetails[]> {
  // bookId is the filename from index.json (e.g., "CET4luan_1.json")
  const filename = bookId.endsWith('.json') ? bookId : `${bookId}.json`;
  const text = await fetchFromVocabularyBooks(filename);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: ReaderVocabularyWordDetails[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as RawBookLine;
      const normalized = normalizeWordDetails(parsed, bookTitle);
      if (normalized) {
        result.push(normalized);
      }
    } catch {
      // Skip malformed lines instead of failing the whole book.
    }
  }

  return result;
}

export function buildReaderVocabularyData(
  selectedBookIds: string[],
  catalogById: Record<string, VocabularyBookCatalogItem>,
  detailsByBookId: Record<string, ReaderVocabularyWordDetails[]>,
): ReaderVocabularyData {
  const vocabularyHighlightColorByWord: Record<string, string> = {};
  const vocabularyBookIdsByWord: Record<string, string[]> = {};
  const vocabularyWordDetailsByWord: Record<string, ReaderVocabularyWordDetails[]> = {};

  selectedBookIds.forEach((bookId, index) => {
    const color = BOOK_HIGHLIGHT_COLORS[index % BOOK_HIGHLIGHT_COLORS.length];
    const title = catalogById[bookId]?.title || bookId;
    const details = detailsByBookId[bookId] || [];

    details.forEach((item) => {
      const key = item.headWord.toLowerCase();
      if (!key) {
        return;
      }

      const normalizedItem: ReaderVocabularyWordDetails = {
        ...item,
        bookId,
        bookTitle: title,
      };

      if (!vocabularyWordDetailsByWord[key]) {
        vocabularyWordDetailsByWord[key] = [];
      }
      vocabularyWordDetailsByWord[key].push(normalizedItem);

      if (!vocabularyBookIdsByWord[key]) {
        vocabularyBookIdsByWord[key] = [];
      }
      if (!vocabularyBookIdsByWord[key].includes(bookId)) {
        vocabularyBookIdsByWord[key].push(bookId);
      }

      // First selected vocabulary book wins for highlight color when overlap happens.
      if (!vocabularyHighlightColorByWord[key]) {
        vocabularyHighlightColorByWord[key] = color;
      }
    });
  });

  return {
    vocabularyHighlightColorByWord,
    vocabularyBookIdsByWord,
    vocabularyWordDetailsByWord,
  };
}
