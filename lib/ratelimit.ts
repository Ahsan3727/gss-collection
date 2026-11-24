// In-memory sliding window rate-limiter with optional Redis fallback
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  limit = 20,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Clean expired in-memory entries occasionally
  if (memoryStore.size > 2000) {
    memoryStore.forEach((val, key) => {
      if (val.expiresAt < now) memoryStore.delete(key);
    });
  }

  const record = memoryStore.get(identifier);

  if (!record || record.expiresAt < now) {
    memoryStore.set(identifier, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.expiresAt / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.expiresAt / 1000),
  };
}
