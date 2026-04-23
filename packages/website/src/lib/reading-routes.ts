export function getBookChapterReaderUrl(level: string, slug: string, chapterNumber: number | string) {
  return `/books-reader/${encodeURIComponent(level)}/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapterNumber))}`;
}

export function getIELTSPassageReaderUrl(
  year: string,
  month: string,
  test: string,
  passage: string,
) {
  return `/ielts-reader/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(test)}/${encodeURIComponent(passage)}`;
}
