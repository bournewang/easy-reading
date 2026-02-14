/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	IMAGES_BUCKET: R2Bucket;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url).searchParams.get('url');
			
			if (!url) {
				return new Response('URL is required', { status: 400 });
			}

			// Create a hash of the URL to use as the storage key
			const urlHash = btoa(url).replace(/[/+=]/g, '');
			const key = `images/${urlHash}`;

			// Try to get from R2 first
			const stored = await env.IMAGES_BUCKET.get(key);
			
			if (stored) {
				// Return cached image with appropriate headers
				return new Response(stored.body, {
					headers: {
						'Content-Type': stored.httpMetadata?.contentType || 'image/jpeg',
						'Cache-Control': 'public, max-age=31536000',
						'Access-Control-Allow-Origin': '*',
						'Cache-Hit': 'true'
					}
				});
			}

			// If not in storage, fetch and store
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});

			if (!response.ok) {
				return new Response('Failed to fetch image', { status: response.status });
			}

			// Get the image data and content type
			const imageData = await response.arrayBuffer();
			const contentType = response.headers.get('content-type') || 'image/jpeg';

			// Store in R2
			await env.IMAGES_BUCKET.put(key, imageData, {
				httpMetadata: {
					contentType,
					cacheControl: 'public, max-age=31536000'
				}
			});

			// Return the image
			return new Response(imageData, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=31536000',
					'Access-Control-Allow-Origin': '*',
					'Cache-Hit': 'false'
				}
			});

		} catch (error) {
			console.error('Error:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	}
} satisfies ExportedHandler<Env>;
