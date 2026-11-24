import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';

export const dynamic = 'force-dynamic';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ query: q, results: [] });
    }

    // Limit length to avoid denial of service
    const sanitized = escapeRegex(q.slice(0, 64));

    await connectDB();
    const regex = new RegExp(sanitized, 'i');

    const products = await Product.find({
      status: 'active',
      $or: [
        { title: { $regex: regex } },
        { desc: { $regex: regex } },
        { tags: { $in: [regex] } },
        { stones: { $in: [regex] } },
        { cat: { $regex: regex } },
      ],
    })
      .select('id handle title setting cat kind base compareAt stones photos status')
      .limit(16)
      .lean();

    return NextResponse.json({
      query: q,
      count: products.length,
      results: JSON.parse(JSON.stringify(products)),
    });
  } catch (err: any) {
    console.error('[Search API Error]:', err);
    return NextResponse.json({ query: '', results: [], error: 'Search temporarily unavailable' }, { status: 500 });
  }
}
