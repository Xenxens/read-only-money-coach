import type { RateLimitInfo } from "@/lib/types";

const WINDOW_MS = 60 * 60 * 1_000;
const LIMIT = 20;

/**
 * Demo-grade fixed-window-per-visitor limiter. It lives in process memory and
 * resets whenever a serverless instance is recycled or the app is redeployed.
 */
const requestBuckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
}

function pruneStaleVisitors(now: number): void {
  if (requestBuckets.size < 2_000) {
    return;
  }

  for (const [visitorId, timestamps] of requestBuckets) {
    const recent = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
    if (recent.length === 0) {
      requestBuckets.delete(visitorId);
    } else {
      requestBuckets.set(visitorId, recent);
    }
  }
}

export function checkRateLimit(
  visitorId: string,
  now: number = Date.now(),
): RateLimitResult {
  pruneStaleVisitors(now);

  const existing = requestBuckets.get(visitorId) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= LIMIT) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      info: {
        limit: LIMIT,
        remaining: 0,
        resetAt: new Date(oldest + WINDOW_MS).toISOString(),
      },
    };
  }

  recent.push(now);
  requestBuckets.set(visitorId, recent);

  return {
    allowed: true,
    info: {
      limit: LIMIT,
      remaining: Math.max(0, LIMIT - recent.length),
      resetAt: new Date(recent[0] + WINDOW_MS).toISOString(),
    },
  };
}

export const RATE_LIMIT_PER_HOUR = LIMIT;
