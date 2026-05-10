import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { checkEmailRateLimit } from './lib/rateLimiter';
import { sendEmail } from './lib/agentmail';

export const config = {
  runtime: 'nodejs',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  to: z.string().email({ message: 'Invalid recipient email address' }),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(10000, 'Body too long'),
  replyTo: z.string().email({ message: 'Invalid reply-to email address' }).optional(),
});

function getHeader(req: IncomingMessage, name: string): string {
  const val = req.headers[name];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: object, extra?: Record<string, string>) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...extra,
  });
  res.end(payload);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  try {
    const rawDeviceId = getHeader(req, 'x-device-id');
    const rawConvId = getHeader(req, 'x-conversation-id');
    const timezone = getHeader(req, 'x-timezone') || 'UTC';

    const deviceId = UUID_RE.test(rawDeviceId) ? rawDeviceId : 'unknown';
    const conversationId = UUID_RE.test(rawConvId) ? rawConvId : 'unknown';
    void conversationId; // reserved for analytics

    const rawIp = getHeader(req, 'x-forwarded-for') || 'unknown';
    const ip = rawIp.split(',')[0].trim() || 'unknown';

    const rateLimit = await checkEmailRateLimit(deviceId, ip, timezone);
    if (!rateLimit.allowed) {
      json(res, 429, { error: 'rate_limit_exceeded', resetAt: rateLimit.resetAt, remaining: 0 }, {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      });
      return;
    }

    const rawBody = await readBody(req);
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      json(res, 400, { error: parsed.error.issues[0]?.message ?? 'Invalid request' });
      return;
    }

    const { to, subject, body, replyTo } = parsed.data;

    const { messageId } = await sendEmail(deviceId, { to, subject, text: body, replyTo });

    json(res, 200, { messageId, sentAt: Date.now() }, {
      'X-RateLimit-Remaining': String(rateLimit.remaining - 1),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
    });
  } catch (err) {
    console.error('[api/email]', err);

    // Surface AgentMail 4xx errors to the client
    const raw = err as Record<string, unknown>;
    if (raw?.statusCode && typeof raw.statusCode === 'number' && raw.statusCode >= 400 && raw.statusCode < 500) {
      const message = typeof raw.message === 'string' ? raw.message : 'Bad request';
      json(res, raw.statusCode as number, { error: message });
      return;
    }

    json(res, 502, { error: 'Failed to send email. Please try again.' });
  }
}

