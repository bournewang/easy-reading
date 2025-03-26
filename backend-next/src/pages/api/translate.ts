import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import OpenAI from 'openai';
// import { HttpsProxyAgent } from 'https-proxy-agent';

// Input validation schema
const translateSchema = z.object({
  text: z.string().min(1),
  target_lang: z.string().default('zh-CN')
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_API_URL,
  // httpAgent: new HttpsProxyAgent('http://127.0.0.1:7890'), // Optional: if you need proxy
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const { text, target_lang } = translateSchema.parse(req.body);

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "deepseek-v3",  // Using deepseek-v3 as specified in Python code
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
    return res.json({
      data: translation,
      success: true
    });

  } catch (error) {
    console.error('Translation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Translation failed' 
    });
  }
} 