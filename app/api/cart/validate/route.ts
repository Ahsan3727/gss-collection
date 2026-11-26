import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { loadSettings } from '@/lib/settings';
import { resolveShippingOption, resolveVariantSelection } from '@/lib/pricing';
import { CartValidateInputSchema } from '@/lib/schemas';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';
import type { ProductRecord } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`cart:${ip}`, 60, 60);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset);
    }

    const rawBody: unknown = await req.json();
    const parsed = CartValidateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cart payload' }, { status: 400 });
    }

    const { items: rawItems, country = 'PK', shippingMethodId = 'std' } = parsed.data;

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
    const settings = await loadSettings();

    const validatedItems = [];
    const issues: string[] = [];
    let subtotal = 0;

    for (const item of rawItems) {
      const lookupClauses: Record<string, string>[] = [];
      if (item.productId) {
        lookupClauses.push({ id: item.productId }, { handle: item.productId });
      }
      if (item.handle) {
        lookupClauses.push({ handle: item.handle });
      }
      if (lookupClauses.length === 0) continue;

      const product = (await Product.findOne({
        $or: lookupClauses,
        status: 'active',
      }).lean()) as ProductRecord | null;

      if (!product) {
        issues.push(`"${item.title || 'Selected item'}" is no longer available.`);
        continue;
      }

      const stone = item.stone || product.stones[0] || 'garnet';
      const size = item.size || product.sizes[0] || '7';
      const qty = Math.max(1, Math.min(10, Number(item.qty) || 1));

      const resolved = resolveVariantSelection(product, stone, size);

      if (resolved.mode === 'unavailable' || resolved.price === null || !resolved.available) {
        issues.push(`"${product.title}" (${stone}, Size ${size}) is currently sold out.`);
        continue;
      }

      const finalQty = Math.min(qty, resolved.stock);
      if (finalQty < qty) {
        issues.push(`Only ${resolved.stock} unit(s) of "${product.title}" (${stone}) available.`);
      }

      subtotal += resolved.price * finalQty;

      validatedItems.push({
        productId: product.id,
        handle: product.handle,
        title: product.title,
        stone,
        size,
        price: resolved.price,
        qty: finalQty,
        maxStock: resolved.stock,
        photo: product.photos?.[0] || '',
        sku: resolved.sku,
      });
    }

    const shippingInfo = resolveShippingOption(settings, subtotal, country, shippingMethodId, false);
    const total = subtotal + shippingInfo.price;

    return NextResponse.json({
      valid: issues.length === 0 && validatedItems.length > 0,
      items: validatedItems,
      subtotal,
      shipping: shippingInfo.price,
      shippingLabel: shippingInfo.label,
      total,
      freeShippingThreshold: settings.freeShippingFrom,
      issues,
    });
  } catch (err: unknown) {
    console.error('[Cart Validate Error]:', err);
    return NextResponse.json({ error: 'Failed to validate cart' }, { status: 500 });
  }
}
