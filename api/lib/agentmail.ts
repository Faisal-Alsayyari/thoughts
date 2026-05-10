/// <reference types="node" />
import { AgentMailClient } from 'agentmail';
import { redis } from './redis';

const INBOX_CACHE_TTL_DAYS = 30;

// Initialise a single AgentMail client with the server-owned API key.
const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY! });

/**
 * Returns the AgentMail inbox ID for a given device, creating one on first use.
 * The inbox ID is cached in Redis for 30 days to avoid redundant create calls.
 * Using `clientId` makes the create call idempotent — safe to retry.
 */
export async function getOrCreateInbox(deviceId: string): Promise<{ inboxId: string }> {
  const cacheKey = `agentmail:inbox:${deviceId}`;

  // Try cache first
  const cached = await redis.get<string>(cacheKey);
  if (cached) {
    return { inboxId: cached };
  }

  // Provision a new inbox. clientId makes this idempotent on retry.
  const inbox = await client.inboxes.create({
    clientId: `thoughts-${deviceId}`,
  });

  const inboxId: string = (inbox as { inboxId?: string; inbox_id?: string }).inboxId
    ?? (inbox as { inboxId?: string; inbox_id?: string }).inbox_id
    ?? '';

  if (!inboxId) {
    throw new Error('AgentMail inbox creation returned no inboxId');
  }

  // Cache for TTL_DAYS; use EX (seconds)
  await redis.set(cacheKey, inboxId, { ex: INBOX_CACHE_TTL_DAYS * 86400 });

  return { inboxId };
}

/**
 * Sends an email from the device's AgentMail inbox.
 */
export async function sendEmail(
  deviceId: string,
  opts: { to: string; subject: string; text: string; replyTo?: string },
): Promise<{ messageId: string }> {
  const { inboxId } = await getOrCreateInbox(deviceId);

  const result = await client.inboxes.messages.send(inboxId, {
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });

  return { messageId: result.messageId ?? '' };
}
