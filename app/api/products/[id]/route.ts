import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const product = await Product.findOne({
      $or: [{ id: params.id }, { handle: params.id }, { _id: params.id }],
    }).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve product' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    await connectDB();

    const product = await Product.findOne({
      $or: [{ id: params.id }, { handle: params.id }, { _id: params.id }],
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (body.title) product.title = body.title;
    if (body.desc !== undefined) product.desc = body.desc;
    if (body.base) product.base = Number(body.base);
    if (body.compareAt !== undefined) product.compareAt = body.compareAt ? Number(body.compareAt) : undefined;
    if (body.status) product.status = body.status;
    if (body.photos) product.photos = body.photos;
    if (body.variants) product.variants = body.variants;

    await product.save();
    await logAdminAction(auth.user.email, 'product_update', 'Product', product.id, body);

    return NextResponse.json({ success: true, product: JSON.parse(JSON.stringify(product)) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const product = await Product.findOneAndDelete({
      $or: [{ id: params.id }, { handle: params.id }, { _id: params.id }],
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await logAdminAction(auth.user.email, 'product_delete', 'Product', product.id, {
      title: product.title,
      handle: product.handle,
    });

    return NextResponse.json({ success: true, message: 'Product removed from catalogue' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
