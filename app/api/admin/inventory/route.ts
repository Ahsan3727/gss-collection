import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

const inventoryPatchSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().optional(),
  stone: z.string().min(1),
  size: z.string().min(1),
  stock: z.number().finite().min(0).max(10000),
});

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const rawBody: unknown = await req.json();
    const parsed = inventoryPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid stock payload' }, { status: 400 });
    }

    const { productId, sku, stone, size } = parsed.data;
    const newStock = Math.max(0, Math.floor(parsed.data.stock));

    await connectDB();

    const product = await Product.findOne({
      $or: [{ id: productId }, { handle: productId }],
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let matched = false;
    if (product.variants && product.variants.length > 0) {
      const v = product.variants.find(
        (item) => (stone && size && item.stone === stone && item.size === size) || (sku && item.sku === sku)
      );
      if (v) {
        v.stock = newStock;
        matched = true;
      }
    }

    if (product.inventory && stone && size) {
      const key = `${stone}:${size}`;
      product.inventory.set(key, newStock);
      matched = true;
    }

    if (!matched) {
      return NextResponse.json({ error: 'Variant not found on product' }, { status: 404 });
    }

    await product.save();
    await logAdminAction(auth.user.email, 'stock_update', 'Product', product.id, {
      sku,
      stone,
      size,
      newStock,
    });

    revalidateTag('products');
    revalidateTag(`product:${product.handle}`);

    return NextResponse.json({ success: true, updatedStock: newStock });
  } catch (err: unknown) {
    console.error('[Inventory PATCH Error]:', err);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
