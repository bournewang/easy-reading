import OpenAI from "openai";

interface Env {
    // XAI_API_KEY: string;
    DASHSCOPE_API_KEY: string;
    TRANSLATE_CACHE: KVNamespace;
}

// define big models name and url array
const models = {
    'grok-2-latest': "https://api.x.ai/v1",
    'deepseek-v3': "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // 'grok-2-latest': "    'grok-2-latest': "URL_ADDRESS.x.ai/v1"
};
const MODEL_NAME = "deepseek-v3";
const MODEL_URL = models[MODEL_NAME];

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


export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const MODEL_KEY = env.DASHSCOPE_API_KEY;

        // 添加 CORS 处理
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // disable request other entry point except '/translate'
        if (!request.url.endsWith('/translate')) {
            return new Response('Not Found', { status: 404 });
        }

        try {
            if (request.method !== 'POST') {
                return new Response('Method not allowed', {
                    status: 405,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            const { text, target_lang } = await request.json();
            if (!text || !target_lang) {
                return new Response('text or target_lang is empty', {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            const formattedMessages = [{ role: 'user', content: `translate into ${target_lang}: ` + text }];
            console.log("message: ", formattedMessages)
            // Create cache key from message
            const cacheKey = await sha256(JSON.stringify(formattedMessages));
            console.log("cacheKey: ", cacheKey)

            // Try to get from cache first
            const cachedResponse = await env.TRANSLATE_CACHE.get(cacheKey);
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
                apiKey: MODEL_KEY,
                baseURL: MODEL_URL,
            });

            const completion = await client.chat.completions.create({
                model: MODEL_NAME,
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 1000,
            });

            const result = completion.choices[0].message.content;

            // Store in cache (expires in 24 hours)
            await env.TRANSLATE_CACHE.put(cacheKey, result, { expirationTtl: 86400 });

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
