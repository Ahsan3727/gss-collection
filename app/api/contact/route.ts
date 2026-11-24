import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';

export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional(),
  message: z.string().min(5, 'Message must be at least 5 characters').max(2000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid form data' }, { status: 400 });
    }

    await connectDB();
    await Message.create(parsed.data);

    return NextResponse.json({ success: true, message: 'Your message has been received by our atelier.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
  }
}
