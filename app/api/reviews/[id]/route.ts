import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Review } from '@/lib/models/Review';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { approved } = (await req.json()) as { approved?: boolean };
    await connectDB();

    const review = await Review.findByIdAndUpdate(
      params.id,
      { approved: Boolean(approved) },
      { new: true }
    );
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    revalidateTag(`reviews:${review.productId}`);
    return NextResponse.json({ success: true, review: JSON.parse(JSON.stringify(review)) });
  } catch (err) {
    console.error('[Review PATCH Error]:', err);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const deleted = await Review.findByIdAndDelete(params.id);
    if (deleted) {
      revalidateTag(`reviews:${deleted.productId}`);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Review DELETE Error]:', err);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
