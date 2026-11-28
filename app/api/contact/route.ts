import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Valid email address is required'),
  phone: z.string().max(30).optional(),
  message: z.string().min(5, 'Message must be at least 5 characters').max(2000),
});

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`contact:${ip}`, 5, 600);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset, 'Too many messages sent recently. Please try later.');
    }

    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;
    const parsed = contactSchema.safeParse(bodyResult.data);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid form data' },
        { status: 400 }
      );
    }

    await connectDB();
    await Message.create(parsed.data);

    return NextResponse.json({ success: true, message: 'Your message has been received by our atelier.' });
  } catch (err: unknown) {
    console.error('[Contact POST Error]:', err);
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
  }
}
