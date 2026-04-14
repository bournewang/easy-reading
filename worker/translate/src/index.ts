import OpenAI from "openai";

interface Env {
    // XAI_API_KEY: string;
    DASHSCOPE_API_KEY: string;
    TRANSLATE_CACHE?: KVNamespace;
}

// define big models name and url array
const models = {
    'grok-2-latest': "https://api.x.ai/v1",
    'deepseek-v3': "https://dashscope.aliyuncs.com/compatible-mode/v1",
    'qwen3.5-flash': "https://dashscope.aliyuncs.com/compatible-mode/v1",
    'qwen3.6-plus': "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // 'grok-2-latest': "    'grok-2-latest': "URL_ADDRESS.x.ai/v1"
};
const MODEL_NAME = "qwen3.6-plus"; //"deepseek-v3";
const MODEL_URL = models[MODEL_NAME];
const ENABLE_THINKING = false;

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
        const startedAt = Date.now();
        const url = new URL(request.url);
        const debugEnabled = url.searchParams.get('debug') === '1' || request.headers.get('x-debug') === '1';

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Debug',
        };

        const buildResponse = (
            body: Record<string, unknown>,
            init?: ResponseInit,
            extraHeaders?: Record<string, string>,
        ) =>
            new Response(JSON.stringify(body), {
                ...init,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                    ...extraHeaders,
                    ...(init?.headers || {}),
                },
            });

        // 添加 CORS 处理
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    ...corsHeaders,
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // disable request other entry point except supported translate paths
        if (url.pathname !== '/api/translate' && url.pathname !== '/translate') {
            return new Response('Not Found', { status: 404 });
        }

        try {
            if (!MODEL_KEY) {
                return buildResponse({ error: 'DASHSCOPE_API_KEY is missing' }, { status: 500 });
            }
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
            const cachedResponse = env.TRANSLATE_CACHE
                ? await env.TRANSLATE_CACHE.get(cacheKey)
                : null;
            if (cachedResponse) {
                console.log("Cache hit! Returning cached response.")
                return buildResponse({
                    data: cachedResponse,
                    success: true,
                    ...(debugEnabled ? {
                        debug: {
                            cacheHit: true,
                            model: MODEL_NAME,
                            baseURL: MODEL_URL,
                            enableThinking: ENABLE_THINKING,
                            enableThinkingPlacement: 'top_level',
                            elapsedMs: Date.now() - startedAt,
                            cacheKey,
                        },
                    } : {}),
                }, undefined, {
                    'Cache-Hit': 'true',
                });
            }
            console.log("Cache miss! Fetching from OpenAI.")

            const client = new OpenAI({
                apiKey: MODEL_KEY,
                baseURL: MODEL_URL,
            });

            const requestPayload = {
                model: MODEL_NAME,
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 1000,
		enable_thinking: ENABLE_THINKING
            };
            console.log("translate request config:", JSON.stringify({
                model: requestPayload.model,
                temperature: requestPayload.temperature,
                max_tokens: requestPayload.max_tokens,
                enable_thinking: requestPayload.enable_thinking,
                debugEnabled,
            }));

            const upstreamStartedAt = Date.now();
            const completion = await client.chat.completions.create(requestPayload);
            const upstreamElapsedMs = Date.now() - upstreamStartedAt;

            const result = completion.choices[0].message.content;
            const reasoningContent = (completion.choices[0].message as { reasoning_content?: unknown }).reasoning_content;
            console.log("translate upstream result summary:", JSON.stringify({
                hasResult: Boolean(result),
                resultPreview: typeof result === 'string' ? result.slice(0, 160) : null,
                hasReasoningContent: reasoningContent != null,
                usage: completion.usage ?? null,
                upstreamElapsedMs,
            }));

            // Store in cache (expires in 24 hours)
            if (env.TRANSLATE_CACHE) {
                await env.TRANSLATE_CACHE.put(cacheKey, result, { expirationTtl: 86400 });
            }

            return buildResponse({
                data: result,
                success: true,
                ...(debugEnabled ? {
                    debug: {
                        cacheHit: false,
                        model: MODEL_NAME,
                        baseURL: MODEL_URL,
                        enableThinking: ENABLE_THINKING,
                        enableThinkingPlacement: 'top_level',
                        elapsedMs: Date.now() - startedAt,
                        upstreamElapsedMs,
                        cacheKey,
                        usage: completion.usage ?? null,
                        hasReasoningContent: reasoningContent != null,
                        responsePreview: typeof result === 'string' ? result.slice(0, 160) : null,
                    },
                } : {}),
            }, undefined, {
                'Cache-Hit': 'false',
            });

        } catch (error) {
            console.error(error);
            return buildResponse({
                error: error instanceof Error ? error.message : String(error),
                ...(debugEnabled ? {
                    debug: {
                        model: MODEL_NAME,
                        baseURL: MODEL_URL,
                        enableThinking: ENABLE_THINKING,
                        enableThinkingPlacement: 'top_level',
                        elapsedMs: Date.now() - startedAt,
                    },
                } : {}),
            }, { status: 500 });
        }
    }
};
