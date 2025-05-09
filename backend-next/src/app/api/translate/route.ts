import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

// Input validation schema
const translateSchema = z.object({
  text: z.string().min(1),
  target_lang: z.string().default('zh-CN')
});

// Initialize OpenAI client
// Ensure your environment variables DASHSCOPE_API_KEY and DASHSCOPE_API_URL are set
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_API_URL,
  // httpAgent: new HttpsProxyAgent('http://127.0.0.1:7890'), // Optional: if you need proxy
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const { text, target_lang } = translateSchema.parse(body);

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "deepseek-v3", // Using deepseek-v3 as specified in Python code
      messages: [
        {
          role: 'user',
          content: `translate into ${target_lang}: ${text}`
        }
      ]
    });

    // Extract translation from response
    const translation = completion?.choices[0]?.message?.content?.trim() || '';

    // Return successful response
    return NextResponse.json({
      data: translation,
      success: true
    });

  } catch (error) {
    console.error('Translation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Translation failed' 
      },
      { status: 500 }
    );
  }
} 