/// <reference types="@cloudflare/workers-types" />
import { load } from 'cheerio';

interface ScrapedArticle {
	id: string;
	title: string;
	url: string;
	category: string;
	description: string;
	imageUrl: string;
	source: string;
	readingTime: number;
}

interface Env {
	ARTICLES: KVNamespace;
	API_TOKEN?: string;
}

const BBC_SITE='https://www.bbc.com'
const SUFFIX=''
// const BBC_SITE='http://localhost:8001'
// const SUFFIX='.html'
const sources = {
	bbc: {
		main: BBC_SITE,
		// main: 'http://localhost:8001/bbc.html',
		// main: null,
		categories: {
			arts: 		`${BBC_SITE}/arts${SUFFIX}`,
			culture: 	`${BBC_SITE}/culture${SUFFIX}`,
			business: 	`${BBC_SITE}/business${SUFFIX}`,
			inovation: 	`${BBC_SITE}/innovation${SUFFIX}`,
			travel: 	`${BBC_SITE}/travel${SUFFIX}`,
			earth: 		`${BBC_SITE}/future-planet${SUFFIX}`
		},
		selectors: {
			main: 'main > article > section',
			category: 'main > article > section',
			card: '[data-testid="dundee-card"]',
		}
	}
};

async function fetchHTML(url: string): Promise<string> {
	try {
		console.log(`Fetching URL: ${url}`);
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
  
		const html = await response.text();
		console.log(`Fetched ${url}, HTML length: ${html.length}`);

		// Add basic content check
		if (!html.includes('<html') || !html.includes('<body')) {
			throw new Error('Invalid HTML response');
		}

		return html;
	} catch (error) {
		console.error(`Error fetching ${url}:`, error);
		return '';
	}
}

function extractImageUrl(srcset: string | undefined): string {
	if (!srcset) return '';

	// Split srcset into array of "url width" pairs
	const sources = srcset.split(',').map(src => {
		const [url, width] = src.trim().split(' ');
		return {
			url,
			width: parseInt(width?.replace('w', '') || '0')
		};
	});

	// Find the 480w version, or closest to it
	const target = 480;
	const closest = sources.reduce((prev, curr) => {
		return Math.abs(curr.width - target) < Math.abs(prev.width - target) ? curr : prev;
	});

	return closest.url;
}

async function scrapeBBCPage(url: string, selector: string, category?: string): Promise<{ articles: ScrapedArticle[], debug: any }> {
	const debug: any = {
		url,
		selector,
		category,
		startTime: new Date().toISOString(),
		errors: [],
		steps: []
	};
	console.log("url: ", url);
	console.log("selector: ", selector);

	try {
		debug.steps.push(`Fetching URL: ${url}`);
		const html = await fetchHTML(url);
		if (!html) {
			debug.errors.push('No HTML content received');
			return { articles: [], debug };
		}
		debug.steps.push(`Received HTML length: ${html.length}`);

		const articles: ScrapedArticle[] = [];
		const $ = load(html);
		
		// Handle main page differently
		// if (url === sources.bbc.main) {
			const sections = $(sources.bbc.selectors.main);
			console.log(`== Found ${sections.length} sections`);

			sections.each((sectionIndex, section) => {
			// const section = sections[0];
				const $section = $(section);
				const cards = $section.find(sources.bbc.selectors.card);
				debug.steps.push(`Found ${cards.length} cards in section 0`);

				cards.each((cardIndex, card) => {
					try {
						const $card = $(card);
						const $anchor = $card.find('a[data-testid="internal-link"]');
						const $headline = $card.find('[data-testid="card-headline"]');
						const $description = $card.find('[data-testid="card-description"]');
						const $image = $card.find('img');

						const title = $headline.text().trim();
						const anchorUrl = $anchor.attr('href') || '';
						const description = $description.text().trim();
						const srcset = $image.attr('srcset');
						const imageUrl = extractImageUrl(srcset);
						const articleUrl = anchorUrl.startsWith('http') ? anchorUrl : `https://www.bbc.com${anchorUrl}`;

						console.log("title: ", title);
						console.log("articleUrl: ", articleUrl);
						console.log("description: ", description);
						console.log("imageUrl: ", imageUrl);
						console.log('------------')

						const urlHash = btoa(articleUrl).replace(/[/+=]/g, '');
						if (title && articleUrl) {
							articles.push({
								id: `bbc-${urlHash}`,
								title,
								url: articleUrl,
								category: category as ScrapedArticle['category'] || 'general',
								description: description || 'Read more on BBC',
								imageUrl,
								// srcset: srcset || '',
								source: 'BBC',
								readingTime: 0
							});
							debug.steps.push(`Processed article in section ${sectionIndex + 1}, card ${cardIndex + 1}: ${title}`);
						} else {
							debug.errors.push(`Missing title or URL in section ${sectionIndex + 1}, card ${cardIndex + 1}`);
						}
					} catch (error) {
						debug.errors.push(`Error processing card in section ${sectionIndex + 1}: ${error}`);
					}
				});
			});
		// } 
		// Handle category pages
		// else {
		// 	const elements = $(selector);
		// 	debug.steps.push(`Found ${elements.length} elements with selector: ${selector}`);

		// 	elements.each((index, element) => {
		// 		try {
		// 			const $element = $(element);
		// 			const title = $element.find('.gs-c-promo-heading__title').text().trim();
		// 			const relativeUrl = $element.find('.gs-c-promo-heading').attr('href');
		// 			const description = $element.find('.gs-c-promo-summary').text().trim();
		// 			const imageUrl = $element.find('img').attr('src') || '';

		// 			const articleUrl = relativeUrl?.startsWith('http') ? 
		// 				relativeUrl : 
		// 				`https://www.bbc.com${relativeUrl || ''}`;

		// 			if (title && articleUrl) {
		// 				articles.push({
		// 					id: `bbc-${btoa(articleUrl).slice(0, 10)}`,
		// 					title,
		// 					url: articleUrl,
		// 					category: category as ScrapedArticle['category'],
		// 					description: description || 'Read more on BBC',
		// 					imageUrl,
		// 					source: 'BBC',
		// 					readingTime: Math.floor(Math.random() * 10) + 5
		// 				});
		// 				debug.steps.push(`Processed category article ${index + 1}: ${title}`);
		// 			} else {
		// 				debug.errors.push(`Missing title or URL for category article ${index + 1}`);
		// 			}
		// 		} catch (error) {
		// 			debug.errors.push(`Error processing category article ${index + 1}: ${error}`);
		// 		}
		// 	});
		// }

		if (articles.length === 0) {
			// Store sample HTML for debugging
			if (url === sources.bbc.main) {
				const sampleSection = $(sources.bbc.selectors.main).first().html();
				debug.htmlSample = sampleSection ? sampleSection.slice(0, 1000) : 'No sections found';
			} else {
				const sampleElement = $(selector).first().parent().html();
				debug.htmlSample = sampleElement ? sampleElement.slice(0, 1000) : 'No elements found';
			}
			debug.errors.push('No articles found');
		}

		debug.articleCount = articles.length;
		debug.endTime = new Date().toISOString();
		return { articles, debug };
	} catch (error) {
		debug.errors.push(`Fatal error: ${error}`);
		debug.endTime = new Date().toISOString();
		return { articles: [], debug };
	}
}

async function scrapeBBC(): Promise<{ articles: ScrapedArticle[], debug: any }> {
	const debug: any = {
		source: 'BBC',
		startTime: new Date().toISOString(),
		pages: {},
		errors: []
	};

	try {
		// Fetch main page articles
		const mainResult = await scrapeBBCPage(
			sources.bbc.main,
			sources.bbc.selectors.main
		);
		debug.pages.main = mainResult.debug;

		// Fetch category pages
		const categoryResults = await Promise.all(
			Object.entries(sources.bbc.categories).map(([category, url]) =>
				scrapeBBCPage(url, sources.bbc.selectors.category, category)
			)
		);

		// Combine all articles
		const allArticles = [
			...mainResult.articles,
			...categoryResults.flatMap(result => result.articles)
		];

		// Add category results to debug
		categoryResults.forEach((result, index) => {
			const category = Object.keys(sources.bbc.categories)[index];
			debug.pages[category] = result.debug;
		});

		debug.totalArticles = allArticles.length;
		debug.endTime = new Date().toISOString();

		return { articles: allArticles, debug };
	} catch (error) {
		debug.errors.push(`Fatal error in scrapeBBC: ${error}`);
		debug.endTime = new Date().toISOString();
		return { articles: [], debug };
	}
}

// Add a function to extract text content for debugging
function extractTextContent(html: string): string {
	const $ = load(html);
	return $('body').text().slice(0, 500); // First 500 characters of text content
}

async function fetchAllArticles(): Promise<{ articles: ScrapedArticle[], debug: any }> {
	const debug: any = {
		startTime: new Date().toISOString(),
		sources: {},
		errors: []
	};

	try {
		// Fetch BBC articles
		const bbcResult = await scrapeBBC();
		debug.sources.bbc = bbcResult.debug;

		// Remove duplicates and limit to 100 articles
		const uniqueArticles = Array.from(
			new Map(bbcResult.articles.map(article => [article.url, article])).values()
		).slice(0, 100);

		debug.endTime = new Date().toISOString();
		debug.totalArticles = bbcResult.articles.length;
		debug.uniqueArticles = uniqueArticles.length;

		return { articles: uniqueArticles, debug };
	} catch (error) {
		debug.errors.push(`Fatal error in fetchAllArticles: ${error}`);
		debug.endTime = new Date().toISOString();
		return { articles: [], debug };
	}
}

export default {
	// Handle scheduled task
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log('Starting scheduled article fetch...');
		const result = await fetchAllArticles();
		await env.ARTICLES.put('featured_articles', JSON.stringify(result.articles));
		await env.ARTICLES.put('last_debug', JSON.stringify(result.debug));
		console.log('Scheduled task completed:', result.debug);
	},

	// Handle HTTP requests
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}

		// Require API token for manual updates
		if (url.pathname === '/update' && request.method === 'POST') {
			const authHeader = request.headers.get('Authorization');
			if (authHeader !== `Bearer ${env.API_TOKEN}`) {
				return new Response('Unauthorized', { status: 401 });
			}

			const result = await fetchAllArticles();
			console.log("fetch articles	", result.articles.length)
			if (result.articles.length > 20) {
				console.log("*** update to cache")
				await env.ARTICLES.put('featured_articles', JSON.stringify(result.articles));
				await env.ARTICLES.put('last_debug', JSON.stringify(result.debug));
			}else {
				console.log("*** no update to cache")
			}

			return new Response(JSON.stringify({
				success: true,
				count: result.articles.length,
				debug: result.debug
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get articles
		if (url.pathname === '/articles' && request.method === 'GET') {
			const articles = await env.ARTICLES.get('featured_articles');
			return new Response(articles || '[]', {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				}
			});
		}

		// Get debug info
		if (url.pathname === '/debug' && request.method === 'GET') {
			const debug = await env.ARTICLES.get('last_debug');
			return new Response(debug || '{}', {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				}
			});
		}

		return new Response('Not Found', { status: 404 });
	},
};
