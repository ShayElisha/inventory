/**
 * Rate limiter — Upstash Redis כשיש env, אחרת זיכרון תהליך (dev / fallback).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

function memoryLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(params.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return {
      ok: true,
      remaining: params.limit - 1,
      retryAfterSec: Math.ceil(params.windowMs / 1000),
    };
  }

  if (existing.count >= params.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: params.limit - existing.count,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/** async — בפרודקשן עם Upstash עובד בין instances */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (!hasUpstash()) {
    return memoryLimit(params);
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    const windowSec = Math.max(1, Math.ceil(params.windowMs / 1000));
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(params.limit, `${windowSec} s`),
      prefix: "sfira:rl",
      analytics: false,
    });
    const result = await limiter.limit(params.key);
    return {
      ok: result.success,
      remaining: result.remaining,
      retryAfterSec: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      ),
    };
  } catch {
    // אם Redis נכשל — לא חוסמים לגיטימיים; נופלים לזיכרון
    return memoryLimit(params);
  }
}

/** לשימוש בבדיקות בלבד */
export function _resetRateLimitBuckets() {
  buckets.clear();
}
