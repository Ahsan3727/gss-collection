import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    await connectDB();
    await Message.create({ name, email, phone, message });

    return NextResponse.json({ success: true, message: 'Message sent successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 });
  }
}
