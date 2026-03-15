import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    return new Response('Chat API is working');
  }

  if (req.method === 'POST') {
    try {
      const { prompt, context } = await req.json();

      const messages = [
        ...(context || []),
        { role: 'user', content: prompt }
      ];

      const result = await streamText({
        model: google('gemini-2.5-flash'),
        messages,
      });

      return result.toTextStreamResponse();
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: 'Error processing request' }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}