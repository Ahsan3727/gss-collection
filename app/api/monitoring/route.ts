import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/monitoring';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const monitoringEventSchema = z.object({
  message: z.string().min(1).max(500),
  route: z.string().max(120).optional(),
  area: z.enum(['checkout', 'storefront', 'admin', 'api']).optional(),
  digest: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`monitoring:${ip}`, 30, 60);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const parsed = monitoringEventSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid telemetry event' }, { status: 400 });
    }

    await reportError(new Error(parsed.data.message), {
      area: parsed.data.area || 'storefront',
      route: parsed.data.route,
      level: parsed.data.area === 'checkout' ? 'fatal' : 'error',
      extra: parsed.data.digest ? { digest: parsed.data.digest } : undefined,
    });

    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Monitoring unavailable' }, { status: 500 });
  }
}
