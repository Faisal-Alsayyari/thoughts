import { redis } from './redis';

/**
 * Records analytics for a completed message exchange.
 * All writes are batched in a single pipeline. This is called fire-and-forget
 * from the onFinish callback — errors are logged but not surfaced to the user.
 *
 * Redis schema:
 *   device:{deviceId}            → hash { firstSeen, lastSeen, messageCount, inputTokens, outputTokens }
 *   device:{deviceId}:canvases   → set of unique conversationIds
 *   analytics:devices            → set of all deviceIds (SCARD = total unique users)
 */
export async function recordMessage(
  deviceId: string,
  conversationId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const now = Date.now();
  const deviceKey = `device:${deviceId}`;

  const pipeline = redis.pipeline();
  pipeline.hsetnx(deviceKey, 'firstSeen', now);
  pipeline.hset(deviceKey, { lastSeen: now });
  pipeline.hincrby(deviceKey, 'messageCount', 1);
  pipeline.hincrby(deviceKey, 'inputTokens', inputTokens);
  pipeline.hincrby(deviceKey, 'outputTokens', outputTokens);
  pipeline.sadd(`device:${deviceId}:canvases`, conversationId);
  pipeline.sadd('analytics:devices', deviceId);

  await pipeline.exec();
}
