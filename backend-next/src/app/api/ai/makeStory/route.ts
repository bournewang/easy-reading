import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSystemPrompt, createStreamingResponse, Message } from '../aiWrapper';

// Input validation schema
const wordsSchema = z.object({
  words: z.array(z.string()).min(1).max(30),
  type: z.enum(['article', 'story', 'sentences']).default('sentences'),
  theme: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { words, type, theme, length, level } = wordsSchema.parse(body);

    // Calculate target word count based on length parameter
    const wordCountMap = {
      short: 150,
      medium: 300,
      long: 500
    };
    const targetWordCount = wordCountMap[length];

    // Create the appropriate prompt based on parameters
    let promptText = `You are a language learning assistant. Create several concise, interesting sentences that naturally incorporate ALL of the following words:
${words.join(', ')}

Guidelines:
- Create just 3-5 simple but effective sentences (no long stories)
- Highlight each vocabulary word in BOLD when used (using **word** markdown)
- Write at a ${level} English level
- Make the sentences related to each other to provide context
- Use each word exactly once in a way that clearly demonstrates its meaning
- Keep the total length under 100 words`;

    // Add theme if provided
    if (theme) {
      promptText += `\n- Make the sentences related to the theme: ${theme}`;
    }

    const systemPrompt = createSystemPrompt(promptText);

    // Add simple instruction as user message
    const messages: Message[] = [
      ...systemPrompt,
      { role: 'user', content: `Please write a ${type} using all the provided words. Make it interesting and educational.` }
    ];

    // Use our wrapper to handle the streaming response
    return createStreamingResponse(messages, {
      temperature: 0.7, // Higher temperature for more creative content
      maxTokens: 2000,  // Larger token limit for longer content
    });
    
  } catch (error) {
    console.error('Word story generation error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return Response.json({ error: 'Failed to generate content with the provided words' }, { status: 500 });
  }
}
