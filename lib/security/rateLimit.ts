/**
 * In-memory sliding-window rate limiting per server instance.
 * For multi-instance production, replace with Redis/Upstash later.
 */

type WindowCounter = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, WindowCounter>;

declare global {
  // eslint-disable-next-line no-var
  var __cornerstoneRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!globalThis.__cornerstoneRateLimitStore) {
    globalThis.__cornerstoneRateLimitStore = new Map<string, WindowCounter>();
  }
  return globalThis.__cornerstoneRateLimitStore;
}

function currentCounter(key: string, windowMs: number): WindowCounter {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 0, resetAt: now + windowMs };
    store.set(key, next);
    return next;
  }
  return existing;
}

export type ConsumeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  count: number;
};

/** Generic message shown to users when a route is rate limited. */
export const RATE_LIMIT_TOO_MANY = "Too many attempts. Please try again shortly.";

/** Tunable defaults (IP + route key via buildRateLimitKey). */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 10 * 60_000 },
  signup: { limit: 5, windowMs: 30 * 60_000 },
  passwordReset: { limit: 5, windowMs: 30 * 60_000 },
  demo: { limit: 5, windowMs: 30 * 60_000 },
  requestPortal: { limit: 5, windowMs: 30 * 60_000 },
  /** Resend signup confirmation email (server action). */
  resendVerification: { limit: 5, windowMs: 10 * 60_000 },
} as const;

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): ConsumeRateLimitResult {
  const counter = currentCounter(key, windowMs);
  counter.count += 1;
  getStore().set(key, counter);

  const now = Date.now();
  const retryAfterSeconds = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
  const allowed = counter.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - counter.count),
    retryAfterSeconds,
    count: counter.count,
  };
}

/**
 * Same as consumeRateLimit but never throws — on internal error, allows the request
 * and logs (availability over strict throttling when store fails).
 */
export function consumeRateLimitSafe(params: {
  key: string;
  limit: number;
  windowMs: number;
}): ConsumeRateLimitResult {
  try {
    return consumeRateLimit(params);
  } catch (err) {
    console.warn(
      "[security] Rate limit internal error; allowing request:",
      err instanceof Error ? err.message : err
    );
    return {
      allowed: true,
      remaining: 999,
      retryAfterSeconds: 0,
      count: 0,
    };
  }
}

export function getRateLimitCount({
  key,
  windowMs,
}: {
  key: string;
  windowMs: number;
}): number {
  try {
    return currentCounter(key, windowMs).count;
  } catch {
    return 0;
  }
}

export function clearRateLimitKey(key: string): void {
  try {
    getStore().delete(key);
  } catch {
    /* ignore */
  }
}

export function buildRateLimitKey(route: string, ip: string): string {
  return `${route}:${ip}`;
}
