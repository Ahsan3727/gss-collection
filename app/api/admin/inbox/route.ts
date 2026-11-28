import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';
import { requireAdminApi } from '@/lib/admin-auth';
import { parseJsonBody } from '@/lib/http';

const inboxPatchSchema = z.object({
  id: z.string().min(1),
  read: z.boolean(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const messages = await Message.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ messages: JSON.parse(JSON.stringify(messages)) });
  } catch {
    return NextResponse.json({ error: 'Failed to load inquiries' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;

    const parsed = inboxPatchSchema.safeParse(bodyResult.data);
    if (!parsed.success || !mongoose.isValidObjectId(parsed.data.id)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await connectDB();
    const updated = await Message.findByIdAndUpdate(
      parsed.data.id,
      { read: parsed.data.read },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
