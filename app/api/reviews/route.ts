import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Review } from '@/lib/models/Review';
import { getStoreSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(2, 'Name is required').max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3, 'Review must be at least 3 characters').max(1000),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    await connectDB();
    const query: any = { approved: true };
    if (productId) query.productId = productId;

    const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ reviews });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid review' }, { status: 400 });
    }

    await connectDB();
    const settings = await getStoreSettings();

    // Auto-approve unless moderation is enabled in settings
    const autoApprove = !settings.moderateReviews;

    const review = await Review.create({
      ...parsed.data,
      approved: autoApprove,
    });

    return NextResponse.json({
      success: true,
      review,
      message: autoApprove ? 'Review posted successfully!' : 'Thank you! Your review is pending atelier approval.',
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
