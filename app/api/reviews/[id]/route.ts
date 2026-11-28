import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Review } from '@/lib/models/Review';
import { logAdminAction } from '@/lib/models/AuditLog';
import { requireAdminApi } from '@/lib/admin-auth';
import { parseJsonBody } from '@/lib/http';
import { clientIpFromRequest } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  try {
    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;
    const { approved } = (bodyResult.data || {}) as { approved?: unknown };

    await connectDB();

    const review = await Review.findByIdAndUpdate(
      params.id,
      { approved: Boolean(approved) },
      { new: true }
    );
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    await logAdminAction(
      auth.user.email,
      'review_moderate',
      'Review',
      params.id,
      { approved: review.approved, productId: review.productId },
      clientIpFromRequest(req)
    );

    revalidateTag(`reviews:${review.productId}`);
    return NextResponse.json({ success: true, review: JSON.parse(JSON.stringify(review)) });
  } catch (err) {
    console.error('[Review PATCH Error]:', err);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  try {
    await connectDB();
    const deleted = await Review.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await logAdminAction(
      auth.user.email,
      'review_delete',
      'Review',
      params.id,
      { productId: deleted.productId },
      clientIpFromRequest(req)
    );

    revalidateTag(`reviews:${deleted.productId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Review DELETE Error]:', err);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
