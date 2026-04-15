export function getBookChapterReaderUrl(level: string, slug: string, chapterNumber: number | string) {
  return `/books/${encodeURIComponent(level)}/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapterNumber))}`;
}

export function getIELTSTestReaderUrl(year: string, month: string, test: string) {
  return `/ielts-reader/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(test)}`;
}

export function getIELTSPassageReaderUrl(
  year: string,
  month: string,
  test: string,
  passage: string,
) {
  return `${getIELTSTestReaderUrl(year, month, test)}/${encodeURIComponent(passage)}`;
}
