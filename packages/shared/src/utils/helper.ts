// import axios, { AxiosRequestConfig } from 'axios';
import type { Article, Paragraph } from '../types';

export function fetchArticleElement(): HTMLElement | null {
    // Combine similar searches into a single function
    const searchPatterns = {
        tags: ['article', 'main', 'section'],
        classes: ['content', 'main', 'article', 'post'],
        ids: ['content', 'main', 'article', 'post']
    };

    // Search by tag
    for (const tag of searchPatterns.tags) {
        const element = document.querySelector(tag);
        if (element) return element as HTMLElement;
    }

    // Search by class
    for (const className of searchPatterns.classes) {
        const element = document.querySelector(`.${className}`);
        if (element) return element as HTMLElement;
    }

    // Check for the largest text block
    const allElements = document.body.getElementsByTagName('*');
    let largestElement: HTMLElement | null = null;
    let maxTextLength = 0;
    for (const element of allElements) {
        const htmlElement = element as HTMLElement;
        if (htmlElement.offsetWidth > 0 && htmlElement.offsetHeight > 0) {
            const textContent = htmlElement.textContent;
            if (textContent) {
                const textLength = textContent.length;
                if (textLength > maxTextLength) {
                    maxTextLength = textLength;
                    largestElement = htmlElement;
                }
            }
        }
    }

    return largestElement;
}

export function fetchArticle(): Omit<Article, 'id'> {
    const articleElement = fetchArticleElement();
    if (!articleElement) {
        throw new Error('Could not find article element');
    }

    const paragraphs: Record<number, Paragraph> = {};
    let i = 1;
    // Track processed image URLs to avoid duplicates
    const processedImageUrls = new Set<string>();

    // Function to check if an image is likely an icon
    const isIcon = (img: HTMLImageElement): boolean => {
        // Skip small images (likely icons)
        if (img.width <= 48 || img.height <= 48) return true;
        // Skip images with icon-like names
        const srcLower = img.src.toLowerCase();
        return srcLower.includes('icon') || 
               srcLower.includes('logo') || 
               srcLower.includes('avatar');
    };

    // Function to add an image paragraph if not already processed
    const addImageParagraph = (img: HTMLImageElement, description?: string) => {
        if (!isIcon(img) && !processedImageUrls.has(img.src)) {
            paragraphs[i] = {
                type: "image",
                content: img.src,
                description: description || img.alt || img.title || undefined
            };
            processedImageUrls.add(img.src);
            i++;
        }
    };

    // Process content in order of appearance
    const elements = articleElement.querySelectorAll("p, img, figure");
    elements.forEach((element) => {
        if (element instanceof HTMLParagraphElement) {
            const text = element.textContent?.trim();
            if (text) {
                paragraphs[i] = { 
                    type: "text", 
                    content: text 
                };
                i++;
            }
        } else if (element instanceof HTMLImageElement) {
            addImageParagraph(element);
        } else if (element instanceof HTMLElement && element.tagName.toLowerCase() === 'figure') {
            const img = element.querySelector('img');
            const figcaption = element.querySelector('figcaption');
            
            if (img) {
                addImageParagraph(img, figcaption?.textContent?.trim());
            }
        }
    });

    const info = collectArticleInfo();
    const textContent = Object.values(paragraphs)
        .filter(p => p.type === 'text')
        .map(p => p.content)
        .join('\n');

    return {
        ...info,
        word_count: textContent.split(/\s+/).filter(word => word.length > 0).length,
        created_at: new Date().toISOString(),
        paragraphs,
        unfamiliar_words: []
    };
}

export async function addArticleFromDocument(createArticle: (article: Article) => Promise<Article>) {
    try {
        const article = fetchArticle();
        if (Object.keys(article.paragraphs).length === 0) {
            throw new Error('No paragraphs found in the article');
        }

        const paragraphsArray = Object.values(article.paragraphs);
        const paragraphsRecord: Record<number, Paragraph> = {};
        paragraphsArray.forEach((paragraph, index) => {
            paragraphsRecord[index + 1] = paragraph;
        });
        article.paragraphs = paragraphsRecord;

        return createArticle(article as Article);
    } catch (error) {
        console.error('Failed to extract article:', error);
        throw error;
    }
}

function getMetaContentByName(name: string): string | null {
    const meta = document.querySelector(`meta[name='${name}']`);
    return meta ? meta.getAttribute('content') : null;
}

function getMetaContentByProperty(property: string): string | null {
    const meta = document.querySelector(`meta[property='${property}']`);
    return meta ? meta.getAttribute('content') : null;
}

export function collectArticleInfo() {
    const url = window.location.href;
    const metaTags = {
        author: ['author', 'article:author', 'og:author'],
        siteName: ['og:site_name', 'application-name', 'twitter:site'],
        title: ['og:title', 'twitter:title', 'title']
    };

    const author = metaTags.author
        .map(tag => getMetaContentByName(tag) || getMetaContentByProperty(tag))
        .find(content => content) || 'Unknown Author';

    const siteName = metaTags.siteName
        .map(tag => getMetaContentByProperty(tag))
        .find(content => content) || document.title || window.location.hostname;

    const iconElement = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    const siteIcon = iconElement?.href || `https://${window.location.hostname}/favicon.ico`;

    return {
        url: url,
        title: document.title,
        author: author,
        site_name: siteName,
        site_icon: siteIcon
    };
}

export function cleanWord(word: string): string {
    // remove punctuation and convert to lowercase
    return word.replace(/[.,/#?!$%^&*;:{}=\-_`~()"']/g, "").toLowerCase().trim();
}

export function getHashParams(): Record<string, string> {
    const hash = window.location.hash.substr(1);
    const params: Record<string, string> = {};
    if (hash) {
        hash.split('&').forEach(part => {
            const [key, value] = part.split('=').map(decodeURIComponent);
            if (key && value) {
                params[key] = value;
            }
        });
    }
    return params;
}

export function getQueryParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
}