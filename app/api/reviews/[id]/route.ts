import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Review } from '@/lib/models/Review';
import { requireAdminApi } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { approved } = await req.json();
    await connectDB();

    const review = await Review.findByIdAndUpdate(params.id, { approved: Boolean(approved) }, { new: true });
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    return NextResponse.json({ success: true, review });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    await Review.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
