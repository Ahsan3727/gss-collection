import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { WebVital } from '@/lib/models/WebVital';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';
import { VITAL_NAMES, VITAL_ROUTES, ratingFor } from '@/lib/vitals';

export const dynamic = 'force-dynamic';

const vitalSchema = z.object({
  name: z.enum(VITAL_NAMES),
  value: z.number().finite().min(0).max(600000),
  id: z.string().min(1).max(64),
  route: z.enum(VITAL_ROUTES),
  w: z.number().int().min(0).max(10000).optional(),
  net: z.string().max(10).optional(),
});

// Collects Core Web Vitals from real visitors (browser sends them with
// navigator.sendBeacon). Stores no personal data: no IP, no URL, no cookies.
export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`vitals:${ip}`, 120, 60);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(null, { status: 400 });
    }

    const parsed = vitalSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(null, { status: 400 });
    }

    const { name, value, id, route, w, net } = parsed.data;

    await connectDB();
    await WebVital.create({
      name,
      value,
      rating: ratingFor(name, value),
      route,
      metricId: id,
      viewportWidth: w,
      connection: net,
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[Vitals] Failed to store metric:', err);
    return NextResponse.json({ error: 'Failed to store metric' }, { status: 500 });
  }
}
