import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
    }

    const conversationText = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join('\n');

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: 'Summarize the following conversation in 1-2 concise sentences. Focus on the key topic and outcome. Do NOT use any formatting — just plain text.',
      messages: [
        { role: 'user', content: conversationText },
      ],
    });

    return new Response(JSON.stringify({ summary: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Error generating summary' }), { status: 500 });
  }
}
