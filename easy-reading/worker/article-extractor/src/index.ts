import { HTMLElement } from 'cheerio';
import * as cheerio from 'cheerio';

interface Paragraph {
	type: 'text' | 'image';
	content: string;
	alt?: string;
	description?: string;
  }
  

interface ArticleInfo {
  url: string;
  title: string;
  author: string;
  site_name: string;
  site_icon: string;
}

interface Article extends ArticleInfo {
  paragraphs: Record<string, Paragraph>;
  word_count: number;
  created_at: string;
  unfamiliar_words: string[];
}

function extractMetaContent($: cheerio.CheerioAPI, name?: string, property?: string): string | null {
  if (name) {
    const meta = $(`meta[name="${name}"]`);
    if (meta.length) return meta.attr('content') || null;
  }
  if (property) {
    const meta = $(`meta[property="${property}"]`);
    if (meta.length) return meta.attr('content') || null;
  }
  return null;
}

function collectArticleInfo($: cheerio.CheerioAPI, url: string, content: cheerio.Cheerio<cheerio.Element>): ArticleInfo {
  const metaTags = {
    author: ['author', 'article:author', 'og:author'],
    site_name: ['og:site_name', 'application-name', 'twitter:site'],
    title: [
      'og:title',
      'twitter:title',
      'article:title',
      'headline',
      'title'
    ]
  };

  let author = null;
  for (const tag of metaTags.author) {
    author = extractMetaContent($, tag) || extractMetaContent($, undefined, tag);
    if (author) break;
  }

  let site_name = null;
  for (const tag of metaTags.site_name) {
    site_name = extractMetaContent($, undefined, tag);
    if (site_name) break;
  }

  const domain = new URL(url).hostname;

  // First try to get title from h1 within the determined article element
  let title: string | null = null;

  // If no h1 in article, try meta tags
  if (!title) {
    for (const tag of metaTags.title) {
      title = extractMetaContent($, tag) || extractMetaContent($, undefined, tag);
      console.log(`check tag ${tag}, title ${title} `)
      if (title) break;
    }
  }

  // Fall back to <title> tag if no meta title found
  if (!title) {
    if (content.length) {
      const h1 = content.find('h1');
      if (h1.length) {
        title = h1.text().trim();
      }
    }
  }

  return {
    url,
    title: title?.trim() || '',
    author: author || 'Unknown Author',
    site_name: site_name || domain,
    site_icon: `https://${domain}/favicon.ico`
  };
}

interface Env {
  ARTICLES_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url).searchParams.get('url');
      console.log('request article extractor url: ', url);
      
      if (!url) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Try to get from R2 first
      const urlHash = btoa(url).replace(/[/+=]/g, '');
      const stored = await env.ARTICLES_BUCKET.get(`articles/${urlHash}.json`);
      // if (stored) {
      //   const article = await stored.json();
      //   return new Response(JSON.stringify(article), {
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'Access-Control-Allow-Origin': '*',
      //       'Cache-Hit': 'true'
      //     }
      //   });
      // }

      // If not in storage, fetch and process
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = await response.text();
      const $ = cheerio.load(html);

      // Find main content
      let content: cheerio.Cheerio<HTMLElement> | null = null;
      for (const selector of ['article', 'main', '.content', '.article', '#content']) {
        content = $(selector);
        if (content.length) break;
      }

      if (!content?.length) {
        // Fallback to largest text block
        const paragraphs = $('p');
        if (paragraphs.length) {
          content = paragraphs.filter((_, el) => $(el).text().length > 0)
            .sort((a, b) => $(b).text().length - $(a).text().length)
            .first();
        }
      }

      if (!content?.length) {
        return new Response(JSON.stringify({ error: 'Could not find article content' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Extract paragraphs and images
      const paragraphs: Record<string, Paragraph> = {};
      let wordCount = 0;
      let index = 1;

      content.find('p, img').each((_, element) => {
        const $el = $(element);
        
        if (element.tagName === 'p') {
          const text = $el.text().trim();
          if (text) {
            paragraphs[index.toString()] = {
              type: 'text',
              content: text
            };
            wordCount += text.split(/\s+/).filter(w => w).length;
            index++;
          }
        } else if (element.tagName === 'img') {
          const src = $el.attr('src');
          const alt = $el.attr('alt') || '';
          
          if (src && 
              !src.endsWith('.ico') && 
              !src.endsWith('.svg') &&
              !src.toLowerCase().includes('placeholder') &&
              !src.startsWith('/') &&
              src.length > 10) {
            
            let description = null;
            
            // Check for figure caption
            const figure = $el.closest('figure');
            if (figure.length) {
              const figcaption = figure.find('figcaption');
              if (figcaption.length) {
                description = figcaption.text().trim();
              }
            }
            
            // Check other attributes
            description = description || 
                         $el.attr('aria-label') || 
                         alt ||
                         $el.attr('title');
            
            paragraphs[index.toString()] = {
              type: 'image',
              content: src,
              alt,
              description
            };
            index++;
          }
        }
      });

      if (Object.keys(paragraphs).length === 0) {
        return new Response(JSON.stringify({ error: 'No paragraphs found in the article' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const info = collectArticleInfo($, url, content);
      const article: Article = {
        ...info,
        paragraphs,
        word_count: wordCount,
        created_at: new Date().toISOString(),
        unfamiliar_words: []
      };

      // Save to R2
      await env.ARTICLES_BUCKET.put(`articles/${urlHash}.json`, JSON.stringify(article), {
        httpMetadata: {
          contentType: 'application/json',
        }
      });

      return new Response(JSON.stringify(article), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Hit': 'false'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};