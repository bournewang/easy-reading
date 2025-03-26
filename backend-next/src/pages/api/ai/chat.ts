import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_API_URL
});

// Type definitions
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// In-memory storage (consider using Redis or DB in production)
const articles: Record<string, string> = {};

// Input validation schema
const chatSchema = z.object({
  type: z.enum(['initialize', 'chat']).default('chat'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })).default([]),
  article: z.string().optional(),
  session_id: z.string().optional()
});

function generateChatMessages(article: string, messages: Message[]): Message[] {
  return [
    {
      role: 'system',
      content: `You are an expert English teacher. Your role is to:
1. Review student responses for grammar and vocabulary
2. Provide gentle corrections when needed
4. Ask engaging follow-up questions without asking my choice like in a quiz, untile I give you the instruction. 
    for example, you shouldn't ask me "Would you like to discuss any specific parts of the article further?", 
    instead, you should ask questions about the article content.
5. Keep the discussion focused on the article content.
6. Your answer should be brief, for too much words will make the user feel bored.`
    },
    {
      role: 'system',
      content: `Article context:\n${article}`
    },
    ...messages
  ];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, messages, article, session_id } = chatSchema.parse(req.body);
    let currentSessionId = session_id;
    let currentArticle: string;

    if (type === 'initialize') {
      if (!article) {
        return res.status(400).json({ error: 'Article content is required' });
      }
      currentSessionId = uuidv4();
      articles[currentSessionId] = article;
      currentArticle = article;
      
      // Add initial prompt for discussion
      messages.push({
        role: 'user',
        content: 'Please start a discussion about this article with an engaging question.'
      });
    } else {
      if (!currentSessionId || !articles[currentSessionId]) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      currentArticle = articles[currentSessionId];
    }

    // Generate messages array for API call
    const chatMessages = generateChatMessages(currentArticle, messages);

    // Create chat completion with streaming
    const completion = await openai.chat.completions.create({
      model: "qwen-omni-turbo",
      messages: chatMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    });

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        fullResponse += content;
        
        // Send each chunk as a separate SSE message
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send the final message with complete response and session_id
    const finalMessage = {
      message: fullResponse,
      ...(type === 'initialize' ? { session_id: currentSessionId } : {}),
      done: true
    };
    res.write(`data: ${JSON.stringify(finalMessage)}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    return res.status(500).json({ error: 'Failed to process chat request' });
  }
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
}; 