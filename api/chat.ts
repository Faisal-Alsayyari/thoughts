import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

/*
 * req.method: HTTP request verb (GET, POST, etc.)
 * req.body: JSON body (payload)
 * req.params: URL params
 * req.query: query string
 * req.headers: headers
 */
export default async function handler(req: Request) {

  // handle all GET requests like this
  if (req.method === 'GET') {
    return new Response('Chat API is working');
  }

  // otherwise we expect an LLM response
  
  if (req.method === 'POST') {
    try {
      // extract the prompt and context from the JSON 
      const { prompt, context } = await req.json();

      // Only append this system prompt on the root node, i.e. the context (from previous nodes)
      // is empty.
      
      const system_prompt = "Do NOT attempt to use headers or any time of formatting outside of"
      + "numbers, letters, or dashes for SINGLE ORDER lists. DO NOT try to use nested lists. This is a" 
      + "VERY STRICT RULE. Again, NO HEADERS or any formatting";

      const messages = [
        ...(context || []),
        { role: 'user', content: prompt }
      ];

      const result = await streamText({
        model: google('gemini-2.5-flash'),
        system: system_prompt,
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