type Bucket = { count: number; resetAt: number };

// Single-instance in-memory limiter: enough for the current DEV deployment.
const globalBuckets = globalThis as unknown as { __gwRateBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (globalBuckets.__gwRateBuckets ??= new Map());

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function prune(now: number): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function reset(key?: string): void {
  if (key) buckets.delete(key);
  else buckets.clear();
}

export const LOGIN_LIMITS = {
  perIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  perEmail: { limit: 8, windowMs: 15 * 60 * 1000 },
};


export const PASSWORD_RESET_LIMITS = {
  requestPerIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  requestPerEmail: { limit: 3, windowMs: 15 * 60 * 1000 },
  confirmPerIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  confirmPerEmail: { limit: 8, windowMs: 15 * 60 * 1000 },
};
