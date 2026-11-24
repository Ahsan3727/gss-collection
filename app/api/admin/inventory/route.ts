import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { productId, sku, stone, size, stock } = await req.json();
    const newStock = Math.max(0, parseInt(stock) || 0);

    await connectDB();

    const product = await Product.findOne({
      $or: [{ id: productId }, { handle: productId }],
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update in variants array if present
    if (product.variants && product.variants.length > 0) {
      const v = product.variants.find((item: any) => item.sku === sku || (item.stone === stone && item.size === size));
      if (v) {
        v.stock = newStock;
      }
    }

    // Update inventory Map
    if (product.inventory && stone && size) {
      const key = `${stone}:${size}`;
      product.inventory.set(key, newStock);
    }

    await product.save();
    await logAdminAction(auth.user.email, 'stock_update', 'Product', product.id, {
      sku,
      stone,
      size,
      newStock,
    });

    return NextResponse.json({ success: true, updatedStock: newStock });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
