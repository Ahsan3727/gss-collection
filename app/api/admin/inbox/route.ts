import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const messages = await Message.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load inquiries' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id, read } = await req.json();
    await connectDB();
    await Message.findByIdAndUpdate(id, { read: Boolean(read) });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
