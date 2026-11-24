import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { getAdminSession, requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import {
  buildProductDocument,
  parseProductWrite,
  productLookup,
  readDeltaMap,
} from '@/lib/product-write';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const product = await Product.findOne(productLookup(params.id)).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'active') {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
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
    const parsed = parseProductWrite(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();
    const product = await Product.findOne(productLookup(params.id));

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const handleTaken = await Product.findOne({
      _id: { $ne: product._id },
      $or: [{ handle: parsed.data.handle }, { id: parsed.data.handle }],
    }).lean();
    if (handleTaken) {
      return NextResponse.json({ error: 'A product with this handle already exists.' }, { status: 409 });
    }

    const document = buildProductDocument(parsed.data, {
      id: product.id,
      existingDeltas: readDeltaMap(product.stoneDeltas),
    });

    product.set({
      handle: document.handle,
      title: document.title,
      setting: product.setting || document.setting,
      family: product.family || document.family,
      band: product.band || document.band,
      cat: document.cat,
      kind: document.kind,
      aud: product.cat === document.cat ? product.aud : document.aud,
      stones: document.stones,
      base: document.base,
      stoneDeltas: document.stoneDeltas,
      compareAt: document.compareAt,
      sizes: document.sizes,
      variants: document.variants,
      inventory: document.inventory,
      tags: document.tags,
      photos: document.photos,
      desc: document.desc,
      status: document.status,
    });
    product.markModified('stoneDeltas');
    product.markModified('inventory');

    await product.save();
    await logAdminAction(auth.user.email, 'product_update', 'Product', product.id, {
      title: product.title,
      handle: product.handle,
      status: product.status,
    });

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
    const product = await Product.findOne(productLookup(params.id));

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    product.status = 'archived';
    await product.save();

    await logAdminAction(auth.user.email, 'product_archive', 'Product', product.id, {
      title: product.title,
      handle: product.handle,
    });

    return NextResponse.json({ success: true, message: 'Product archived' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 });
  }
}
