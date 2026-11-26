import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { Discount } from '@/lib/models/Discount';
import { getNextOrderNumber } from '@/lib/models/Counter';
import { loadSettings } from '@/lib/settings';
import { computeDiscount, resolveShippingOption } from '@/lib/pricing';
import { resolveStockSource, takeStock, rollbackStock, type StockTaken } from '@/lib/stock';
import { CreateOrderInputSchema } from '@/lib/schemas';
import { normalizeWhatsAppNumber } from '@/lib/contact';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';
import { reportError } from '@/lib/monitoring';

export async function POST(req: Request) {
  const taken: StockTaken[] = [];
  let reservedDiscountId: unknown = null;

  try {
    const ip = clientIpFromRequest(req);
    const ipLimit = await rateLimit(`orders:ip:${ip}`, 10, 600);
    if (!ipLimit.success) {
      return rateLimitExceededResponse(ipLimit.reset, 'Too many order attempts. Please wait a few minutes.');
    }

    const rawBody: unknown = await req.json();
    const parseResult = CreateOrderInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid order data';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { items, contact, address, payMethod, shippingMethodId, discountCode, note, idempotencyKey } =
      parseResult.data;

    const normalizedPhone = normalizeWhatsAppNumber(contact.phone) || contact.phone.replace(/\D/g, '');
    if (normalizedPhone) {
      const phoneLimit = await rateLimit(`orders:phone:${normalizedPhone}`, 6, 600);
      if (!phoneLimit.success) {
        return rateLimitExceededResponse(phoneLimit.reset, 'Multiple recent orders from this number. Please wait before trying again.');
      }
    }

    await connectDB();

    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey }).lean();
      if (existing) {
        return NextResponse.json({
          success: true,
          orderNo: existing.orderNo,
          accessToken: existing.accessToken,
          message: 'Existing order retrieved',
        });
      }
    }

    const settings = await loadSettings();

    let subtotal = 0;
    const verifiedItems = [];
    const affectedHandles = new Set<string>();

    for (const item of items) {
      const p = await Product.findOne({
        $or: [{ id: item.productId }, { handle: item.productId }, { handle: item.handle }],
        status: 'active',
      });

      if (!p) {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          { error: `Product "${item.title || item.productId}" is not available.` },
          { status: 400 }
        );
      }

      const stone = item.stone;
      const size = item.size;
      const source = resolveStockSource(p, stone, size);

      if (source.mode === 'unavailable') {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          {
            error: `"${p.title}" is no longer available in ${stone}, Size ${size}. Please remove it from your bag.`,
          },
          { status: 400 }
        );
      }

      const { sku, unitPrice } = source;

      if (source.stock < item.qty) {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          {
            error: `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Only ${source.stock} remaining.`,
          },
          { status: 400 }
        );
      }

      const ok = await takeStock(Product, p._id, source.mode, stone, size, item.qty);
      if (!ok) {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          {
            error: `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Someone else just bought it.`,
          },
          { status: 400 }
        );
      }

      taken.push({ dbId: p._id, mode: source.mode, stone, size, qty: item.qty });
      affectedHandles.add(p.handle);

      subtotal += unitPrice * item.qty;
      verifiedItems.push({
        productId: p.id,
        sku,
        handle: p.handle,
        title: p.title,
        stone,
        size,
        qty: item.qty,
        price: unitPrice,
        photo: p.photos?.[0] || '',
      });
    }

    const baseShipping = resolveShippingOption(settings, subtotal, address.country, shippingMethodId, false);

    let discountAmount = 0;
    let appliedDiscountCode: string | undefined;
    let freeShippingFromPromo = false;

    if (discountCode && discountCode.trim()) {
      const disc = await Discount.findOne({
        code: discountCode.trim().toUpperCase(),
        active: true,
      });

      if (disc) {
        const calc = computeDiscount(disc, subtotal, baseShipping.price);
        if (calc.valid) {
          const claimed = await Discount.findOneAndUpdate(
            {
              _id: disc._id,
              active: true,
              $or: [{ limit: 0 }, { $expr: { $lt: ['$uses', '$limit'] } }],
            },
            { $inc: { uses: 1 } },
            { new: true }
          );
          if (claimed) {
            reservedDiscountId = claimed._id;
            discountAmount = calc.freeShipping ? 0 : calc.amount;
            freeShippingFromPromo = calc.freeShipping;
            appliedDiscountCode = calc.code;
          }
        }
      }
    }

    const finalShipping = resolveShippingOption(
      settings,
      subtotal,
      address.country,
      shippingMethodId,
      freeShippingFromPromo
    );

    const total = Math.max(0, subtotal - discountAmount + finalShipping.price);

    const orderNo = await getNextOrderNumber();
    const accessToken = crypto.randomBytes(18).toString('hex');

    const order = await Order.create({
      orderNo,
      items: verifiedItems,
      subtotal,
      discount: discountAmount,
      discountCode: appliedDiscountCode,
      shipping: finalShipping.price,
      shippingLabel: finalShipping.label,
      total,
      payMethod,
      payStatus: 'pending',
      fulfil: 'unfulfilled',
      contact,
      address,
      note,
      idempotencyKey: idempotencyKey || undefined,
      accessToken,
      timeline: [
        {
          at: new Date(),
          text: `Order received via ${payMethod.toUpperCase()}. Awaiting verification.`,
        },
      ],
      adminNotes: [],
      restocked: false,
    });

    revalidateTag('products');
    revalidateTag('orders');
    affectedHandles.forEach((handle) => revalidateTag(`product:${handle}`));

    return NextResponse.json({
      success: true,
      orderNo: order.orderNo,
      accessToken: order.accessToken,
    });
  } catch (err: unknown) {
    await rollbackStock(Product, taken);
    if (reservedDiscountId) {
      await Discount.updateOne({ _id: reservedDiscountId, uses: { $gt: 0 } }, { $inc: { uses: -1 } }).catch(
        () => undefined
      );
    }
    await reportError(err, { area: 'checkout', route: '/api/orders', level: 'fatal' });
    return NextResponse.json(
      { error: 'An unexpected error occurred while placing your order. Please retry.' },
      { status: 500 }
    );
  }
}
