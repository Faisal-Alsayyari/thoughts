import { redis } from './redis';

const DEVICE_DAILY_LIMIT = 20;
const IP_DAILY_LIMIT = 40;

/**
 * Returns today's date as "YYYY-MM-DD" in the given IANA timezone.
 * Falls back to UTC on invalid timezone strings.
 */
function computeLocalDate(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
  }
}

/**
 * Returns the Unix timestamp (seconds) for 2 days after today's local date,
 * at UTC midnight. Using day+2 as a safe cleanup window ensures keys expire
 * well after midnight regardless of the user's UTC offset (max ±14h).
 */
function computeEndOfDayTs(timezone: string): number {
  const localDate = computeLocalDate(timezone);
  const [y, m, d] = localDate.split('-').map(Number);
  const expiry = new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0));
  return Math.floor(expiry.getTime() / 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Increments per-device and per-IP daily counters in Redis.
 * Rejects if either counter exceeds its limit.
 * The device counter is the user-visible limit (20/day).
 * The IP counter is a secondary abuse-prevention layer (40/day).
 */
export async function checkRateLimit(
  deviceId: string,
  ip: string,
  timezone: string,
): Promise<RateLimitResult> {
  const localDate = computeLocalDate(timezone);
  const expireAt = computeEndOfDayTs(timezone);

  const deviceKey = `ratelimit:chat:${deviceId}:${localDate}`;
  const ipKey = `ratelimit:ip:${ip}:${localDate}`;

  // Increment both counters in a single pipeline round-trip
  const pipeline = redis.pipeline();
  pipeline.incr(deviceKey);
  pipeline.incr(ipKey);
  const [deviceCount, ipCount] = (await pipeline.exec()) as [number, number];

  // Set expiry on first write (race condition is benign — worst case the key
  // lives one extra day, which is harmless since it's date-keyed)
  const expiryPipeline = redis.pipeline();
  if (deviceCount === 1) expiryPipeline.expireat(deviceKey, expireAt);
  if (ipCount === 1) expiryPipeline.expireat(ipKey, expireAt);
  if (deviceCount === 1 || ipCount === 1) await expiryPipeline.exec();

  const allowed = deviceCount <= DEVICE_DAILY_LIMIT && ipCount <= IP_DAILY_LIMIT;
  const remaining = Math.max(0, DEVICE_DAILY_LIMIT - deviceCount);

  return { allowed, remaining, resetAt: expireAt };
}

const EMAIL_DEVICE_DAILY_LIMIT = 10;
const EMAIL_IP_DAILY_LIMIT = 20;

/**
 * Per-device and per-IP daily rate limit for the email send endpoint.
 * Stricter than the chat limit since each send costs money.
 */
export async function checkEmailRateLimit(
  deviceId: string,
  ip: string,
  timezone: string,
): Promise<RateLimitResult> {
  const localDate = computeLocalDate(timezone);
  const expireAt = computeEndOfDayTs(timezone);

  const deviceKey = `ratelimit:email:${deviceId}:${localDate}`;
  const ipKey = `ratelimit:emailip:${ip}:${localDate}`;

  const pipeline = redis.pipeline();
  pipeline.incr(deviceKey);
  pipeline.incr(ipKey);
  const [deviceCount, ipCount] = (await pipeline.exec()) as [number, number];

  const expiryPipeline = redis.pipeline();
  if (deviceCount === 1) expiryPipeline.expireat(deviceKey, expireAt);
  if (ipCount === 1) expiryPipeline.expireat(ipKey, expireAt);
  if (deviceCount === 1 || ipCount === 1) await expiryPipeline.exec();

  const allowed = deviceCount <= EMAIL_DEVICE_DAILY_LIMIT && ipCount <= EMAIL_IP_DAILY_LIMIT;
  const remaining = Math.max(0, EMAIL_DEVICE_DAILY_LIMIT - deviceCount);

  return { allowed, remaining, resetAt: expireAt };
}
