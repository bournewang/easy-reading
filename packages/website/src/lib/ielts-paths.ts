export const ieltsMonthLabels: Record<string, string> = {
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  unknown: 'Unknown',
};

export const ieltsMonthOrder = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export type IELTSMonthKey = (typeof ieltsMonthOrder)[number];

export function getIELTSReaderUrl(articleId: string) {
  return `/reader?articleId=${encodeURIComponent(articleId)}`;
}

export function getIELTSTestReaderUrl(year: string, month: string, test: string) {
  return `/ielts-reader/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(test)}`;
}
