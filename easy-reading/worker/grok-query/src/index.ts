import OpenAI from "openai";

interface Env {
    XAI_API_KEY: string;
    DASHSCOPE_API_KEY: string;
    GROK_CACHE: KVNamespace;
}

async function sha256(str: string): Promise<string> {
    // Encode the string as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // Compute SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    
    // Convert the buffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

async function getMessagesFromRequest(request) {
    let message = '';

    if (request.method === 'GET') {
        // Handle GET request with query parameters
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        message = searchParams.get('text') || '';
    } else if (request.method === 'POST') {
        // Check the Content-Type header to determine how to parse the body
        const contentType = request.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
            // Handle JSON payload
            try {
                const jsonData = await request.json();
                message = jsonData.text || '';
            } catch (error) {
                throw new Error('Invalid JSON in request body');
            }
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
            // Handle form data
            try {
                const formData = await request.formData();
                message = formData.get('text') || '';
            } catch (error) {
                throw new Error('Invalid form data in request body');
            }
        } else {
            throw new Error('Unsupported Content-Type');
        }
    } else {
        throw new Error('Method not allowed');
    }

    return message;
}
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // 添加 CORS 处理
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        try {
            // if (request.method !== 'POST') {
            //     return new Response('Method not allowed', {
            //         status: 405,
            //         headers: {
            //             'Access-Control-Allow-Origin': '*'
            //         }
            //     });
            // }
            const message = await getMessagesFromRequest(request);
            const formattedMessages = [{ role: 'user', content: "translate into Chinese: "+message }];
            console.log("message: ", message)
            // Create cache key from message
            const cacheKey = await sha256(JSON.stringify(formattedMessages));
            console.log("cacheKey: ", cacheKey)

            // Try to get from cache first
            const cachedResponse = await env.GROK_CACHE.get(cacheKey);
            if (cachedResponse) {
                console.log("Cache hit! Returning cached response.")
                return new Response(JSON.stringify({'data': cachedResponse, 'success': true}), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Cache-Hit': 'true'
                    }
                });
            }
            console.log("Cache miss! Fetching from OpenAI.")

            const client = new OpenAI({
                // apiKey: env.XAI_API_KEY,
                // baseURL: "https://api.x.ai/v1",
                apiKey: env.DASHSCOPE_API_KEY,
                baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            });

            const completion = await client.chat.completions.create({
                // model: "grok-2-latest",
                model: "deepseek-v3",
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 1000,
            });

            const result = completion.choices[0].message.content;

            // Store in cache (expires in 24 hours)
            await env.GROK_CACHE.put(cacheKey, result, { expirationTtl: 86400 });

            return new Response(JSON.stringify({'data': result, 'success': true}), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Hit': 'false'
                }
            });

        } catch (error) {
            console.error(error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
    }
};
