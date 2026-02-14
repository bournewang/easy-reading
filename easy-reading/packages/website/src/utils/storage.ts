/**
 * Creates a URL-safe storage key from a URL string
 * @param url The URL to hash
 * @returns A URL-safe string that can be used as a storage key
 */
export const urlHash = (url: string): string => {
  return btoa(url).replace(/[/+=]/g, '');
};

/**
 * Gets the storage key for an article
 * @param url The article URL
 * @returns The storage key for the article
 */
export const getArticleStorageKey = (url: string): string => {
  return `article_${urlHash(url)}`;
}; 