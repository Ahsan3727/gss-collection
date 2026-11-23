import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length === 0) {
      return NextResponse.json([]);
    }

    await connectDB();
    const regex = new RegExp(q.trim(), 'i');
    const products = await Product.find({
      status: 'active',
      $or: [{ title: regex }, { desc: regex }, { tags: regex }, { stones: regex }],
    })
      .limit(10)
      .lean();

    return NextResponse.json(products);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
