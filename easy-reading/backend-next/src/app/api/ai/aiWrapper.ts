import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_API_URL
});

// Type definitions
export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Helper function to create system prompt
 */
export function createSystemPrompt(role: string, context?: string): Message[] {
  const messages: Message[] = [
    { role: 'system', content: role }
  ];
  
  if (context) {
    messages.push({ role: 'system', content: context });
  }
  
  return messages;
}

/**
 * Create a streaming response for Next.js App Router with proper unbuffered streaming
 */
export async function createStreamingResponse(
  messages: Message[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  // Use the Web Streams API for proper streaming
  const encoder = new TextEncoder();
  
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start the OpenAI completion in the background
  (async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: options?.model || "qwen-omni-turbo",
        messages: messages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000
      });

      let fullResponse = '';
      
      for await (const chunk of completion) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullResponse += content;
          
          // Send each chunk immediately as a separate SSE message
          const data = JSON.stringify({ content });
          await writer.write(
            encoder.encode(`data: ${data}\n\n`)
          );
          
          // Explicitly flush the writer by closing and reopening it
          // This forces immediate sending of the chunk
          await writer.ready;
        }
      }
      
      // Send the final message with complete response
      const finalMessage = JSON.stringify({ message: fullResponse, done: true });
      await writer.write(
        encoder.encode(`data: ${finalMessage}\n\n`)
      );
      
      await writer.close();
    } catch (error) {
      console.error('Streaming error:', error);
      
      // Send error message as SSE
      const errorMessage = JSON.stringify({ error: 'An error occurred during generation', done: true });
      await writer.write(
        encoder.encode(`data: ${errorMessage}\n\n`)
      );
      
      await writer.close();
    }
  })();
  
  // Return the readable stream immediately, before the async completion finishes
  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no', // Disable buffering in Nginx
    },
  });
}

/**
 * Make a regular non-streaming AI completion
 */
export async function makeCompletion(
  messages: Message[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  try {
    const completion = await openai.chat.completions.create({
      model: options?.model || "qwen-omni-turbo",
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000
    });
    
    return {
      success: true,
      text: completion.choices[0]?.message.content || '',
      completion
    };
  } catch (error) {
    console.error('AI completion error:', error);
    return {
      success: false,
      error
    };
  }
} 