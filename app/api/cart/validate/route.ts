import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { getStoreSettings } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json({
        valid: false,
        items: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        issues: ['Bag is empty'],
      });
    }

    await connectDB();
    const settings = await getStoreSettings();

    const validatedItems = [];
    const issues = [];
    let subtotal = 0;

    for (const item of rawItems) {
      const product = await Product.findOne({
        $or: [{ id: item.productId }, { handle: item.handle }, { handle: item.productId }],
        status: 'active',
      }).lean();

      if (!product) {
        issues.push(`"${item.title || 'Selected item'}" is no longer available.`);
        continue;
      }

      const stone = item.stone || product.stones[0] || 'garnet';
      const size = item.size || product.sizes[0] || '7';
      const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));

      // Calculate server verified price
      const delta = (product.stoneDeltas && (product.stoneDeltas as any)[stone]) || 0;
      const serverPrice = product.base + delta;

      // Check stock
      let availableStock = 10;
      const sku = `${product.handle.toUpperCase()}-${stone.toUpperCase()}-${size}`;

      if (product.variants && product.variants.length > 0) {
        const v = product.variants.find((vr: any) => vr.stone === stone && vr.size === size);
        if (v) availableStock = v.stock;
      } else if (product.inventory) {
        const key = `${stone}:${size}`;
        if (key in product.inventory) {
          availableStock = (product.inventory as any)[key];
        }
      }

      if (availableStock <= 0) {
        issues.push(`"${product.title}" (${stone}, Size ${size}) is currently sold out.`);
        continue;
      }

      const finalQty = Math.min(qty, availableStock);
      if (finalQty < qty) {
        issues.push(`Only ${availableStock} unit(s) of "${product.title}" (${stone}) available.`);
      }

      const itemTotal = serverPrice * finalQty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        handle: product.handle,
        title: product.title,
        stone,
        size,
        price: serverPrice,
        qty: finalQty,
        photo: product.photos?.[0] || '',
        sku,
      });
    }

    const freeShippingThreshold = settings.freeShippingFrom || 15000;
    const shipping = subtotal >= freeShippingThreshold ? 0 : 300;
    const total = subtotal + shipping;

    return NextResponse.json({
      valid: issues.length === 0 && validatedItems.length > 0,
      items: validatedItems,
      subtotal,
      shipping,
      total,
      freeShippingThreshold,
      issues,
    });
  } catch (err: any) {
    console.error('[Cart Validate Error]:', err);
    return NextResponse.json({ error: 'Failed to validate cart' }, { status: 500 });
  }
}
