import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

const getClientIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export const rateLimit = (
  request: NextRequest,
  options: {
    keyPrefix: string;
    limit: number;
    windowMs: number;
  },
): RateLimitResult => {
  const { keyPrefix, limit, windowMs } = options;
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const next: Bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return {
      ok: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt: next.resetAt,
    };
  }

  const nextCount = current.count + 1;
  current.count = nextCount;
  store.set(key, current);

  const remaining = Math.max(limit - nextCount, 0);

  return {
    ok: nextCount <= limit,
    limit,
    remaining,
    resetAt: current.resetAt,
  };
};
