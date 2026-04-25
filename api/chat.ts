import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { checkRateLimit } from './lib/rateLimiter';
import { recordMessage } from './lib/analytics';

export const config = {
  runtime: 'edge',
};

// Only accept well-formed UUIDs to prevent Redis key injection
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    return new Response('Chat API is working');
  }

  if (req.method === 'POST') {
    try {
      const rawDeviceId = req.headers.get('x-device-id') ?? '';
      const rawConvId = req.headers.get('x-conversation-id') ?? '';
      const timezone = req.headers.get('x-timezone') ?? 'UTC';

      // Sanitize device/conversation IDs — fall back to 'unknown' if not a valid UUID
      const deviceId = UUID_RE.test(rawDeviceId) ? rawDeviceId : 'unknown';
      const conversationId = UUID_RE.test(rawConvId) ? rawConvId : 'unknown';

      // Take only the first IP from x-forwarded-for to prevent header spoofing
      const rawIp = req.headers.get('x-forwarded-for') ?? 'unknown';
      const ip = rawIp.split(',')[0].trim() || 'unknown';

      // Enforce rate limit before doing any work
      const rateLimit = await checkRateLimit(deviceId, ip, timezone);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: 'rate_limit_exceeded', resetAt: rateLimit.resetAt, remaining: 0 }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
          },
        );
      }

      const { prompt, context } = await req.json();

      const system_prompt =
        "Use markdown formatting naturally when it aids clarity (bold, headers, code blocks, lists). Prefer a conversational tone — don't over-structure short answers.";

      const messages = [
        ...(context || []),
        { role: 'user', content: prompt },
      ];


      // google genai sdk call
      const result = await streamText({
        model: google('gemini-2.5-flash'),
        system: system_prompt,
        messages,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: 0 } },
        },
        onFinish: ({ usage }) => {
          recordMessage(
            deviceId,
            conversationId,
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0,
          ).catch(console.error);
        },
      });

      // Attach rate limit headers to the streaming response
      const streamResponse = result.toTextStreamResponse();
      const headers = new Headers(streamResponse.headers);
      headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      headers.set('X-RateLimit-Reset', String(rateLimit.resetAt));

      return new Response(streamResponse.body, {
        status: streamResponse.status,
        headers,
      });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: 'Error processing request' }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}