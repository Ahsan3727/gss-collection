import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { Review } from '@/lib/models/Review';
import { loadSettings } from '@/lib/settings';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  productId: z.string().min(1).max(120),
  name: z.string().min(2, 'Name is required').max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3, 'Review must be at least 3 characters').max(1000),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    await connectDB();
    const query: { approved: boolean; productId?: string } = { approved: true };
    if (productId) query.productId = productId;

    const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ reviews: JSON.parse(JSON.stringify(reviews)) });
  } catch (err) {
    console.error('[Reviews GET Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`reviews:${ip}`, 5, 3600);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset, 'Too many reviews submitted recently. Please try later.');
    }

    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;

    const parsed = reviewSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid review' },
        { status: 400 }
      );
    }

    await connectDB();
    const productExists = await Product.exists({
      $or: [{ id: parsed.data.productId }, { handle: parsed.data.productId }],
      status: 'active',
    });
    if (!productExists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const settings = await loadSettings();
    const autoApprove = !settings.moderateReviews;

    const review = await Review.create({
      ...parsed.data,
      approved: autoApprove,
    });

    if (autoApprove) {
      revalidateTag(`reviews:${parsed.data.productId}`);
    }

    return NextResponse.json(
      {
        success: true,
        review: JSON.parse(JSON.stringify(review)),
        message: autoApprove
          ? 'Review posted successfully!'
          : 'Thank you! Your review is pending atelier approval.',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[Reviews POST Error]:', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
