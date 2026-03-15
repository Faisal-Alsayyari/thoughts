import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

export function GET(req: Request) {
  return new Response('Chat API is working');
}

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    const messages = [
      ...(context || []),
      { role: 'user', content: prompt }
    ];

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { status: 500 });
  }
}