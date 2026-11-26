import { connectDB } from '@/lib/db';
import { RateLimit } from '@/lib/models/RateLimit';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Durable MongoDB-backed fixed-window rate limiter using a TTL index on `expiresAt`.
 * Fails open if MongoDB is momentarily unreachable so a limiter issue never blocks genuine orders.
 */
export async function rateLimit(
  identifier: string,
  limit = 20,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const _id = `${identifier}:${windowStart}`;
  const reset = Math.ceil((windowStart + windowMs) / 1000);
  const expiresAt = new Date(windowStart + windowMs + 60_000);

  try {
    await connectDB();
    const update = {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    };

    let doc;
    try {
      doc = await RateLimit.findOneAndUpdate({ _id }, update, {
        upsert: true,
        new: true,
      });
    } catch (e) {
      // Two concurrent first requests in a window race on upsert -> retry once without upsert.
      if ((e as { code?: number }).code !== 11000) throw e;
      doc = await RateLimit.findOneAndUpdate(
        { _id },
        { $inc: { count: 1 } },
        { new: true }
      );
    }

    const count = doc?.count ?? 1;
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  } catch (err) {
    console.error('[RateLimit] Store unavailable, allowing request:', err);
    return {
      success: true,
      limit,
      remaining: limit,
      reset,
    };
  }
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function rateLimitExceededResponse(resetEpochSeconds: number, message = 'Too many requests. Please wait a moment and try again.') {
  const retryAfter = Math.max(1, resetEpochSeconds - Math.floor(Date.now() / 1000));
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  });
}
