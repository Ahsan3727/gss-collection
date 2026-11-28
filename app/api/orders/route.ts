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
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request) {
  const taken: StockTaken[] = [];
  let reservedDiscountId: unknown = null;
  let requestedIdempotencyKey: string | undefined;

  try {
    const ip = clientIpFromRequest(req);
    const ipLimit = await rateLimit(`orders:ip:${ip}`, 10, 600);
    if (!ipLimit.success) {
      return rateLimitExceededResponse(ipLimit.reset, 'Too many order attempts. Please wait a few minutes.');
    }

    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;

    const parseResult = CreateOrderInputSchema.safeParse(bodyResult.data);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid order data';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { items: rawItems, contact, address, payMethod, shippingMethodId, discountCode, note, idempotencyKey } =
      parseResult.data;
    requestedIdempotencyKey = idempotencyKey;

    const normalizedPhone = normalizeWhatsAppNumber(contact.phone) || contact.phone.replace(/\D/g, '');
    if (normalizedPhone) {
      const phoneLimit = await rateLimit(`orders:phone:${normalizedPhone}`, 6, 600);
      if (!phoneLimit.success) {
        return rateLimitExceededResponse(
          phoneLimit.reset,
          'Multiple recent orders from this number. Please wait before trying again.'
        );
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

    // Merge identical (productId, stone, size) entries so each variant is deducted at most once.
    const mergedMap = new Map<string, (typeof rawItems)[number]>();
    for (const item of rawItems) {
      const key = `${item.productId}::${item.stone}::${item.size}`;
      const existing = mergedMap.get(key);
      if (existing) {
        existing.qty += item.qty;
      } else {
        mergedMap.set(key, { ...item });
      }
    }
    const items = Array.from(mergedMap.values());

    // Batch-fetch all candidate active products in a single query instead of N+1 round-trips.
    const productIdentifiers = Array.from(
      new Set(
        items.flatMap((i) => [i.productId, i.handle].filter((v): v is string => Boolean(v && v.trim())))
      )
    );

    const [settings, candidateProducts] = await Promise.all([
      loadSettings(),
      Product.find({
        status: 'active',
        $or: [{ id: { $in: productIdentifiers } }, { handle: { $in: productIdentifiers } }],
      }).lean(),
    ]);

    const productByKey = new Map<string, (typeof candidateProducts)[number]>();
    for (const p of candidateProducts) {
      if (p.id) productByKey.set(p.id, p);
      if (p.handle) productByKey.set(p.handle, p);
    }

    let subtotal = 0;
    const verifiedItems = [];
    const affectedHandles = new Set<string>();

    const abortOrder = async (message: string, status = 400) => {
      await rollbackStock(Product, taken);
      if (reservedDiscountId) {
        await Discount.updateOne({ _id: reservedDiscountId, uses: { $gt: 0 } }, { $inc: { uses: -1 } }).catch(
          () => undefined
        );
      }
      return NextResponse.json({ error: message }, { status });
    };

    for (const item of items) {
      const p = productByKey.get(item.productId) || (item.handle ? productByKey.get(item.handle) : undefined);

      if (!p) {
        return abortOrder(`Product "${item.title || item.productId}" is not available.`);
      }

      const stone = item.stone;
      const size = item.size;
      const source = resolveStockSource(p, stone, size);

      if (source.mode === 'unavailable') {
        return abortOrder(
          `"${p.title}" is no longer available in ${stone}, Size ${size}. Please remove it from your bag.`
        );
      }

      const { sku, unitPrice } = source;

      if (source.stock < item.qty) {
        return abortOrder(
          `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Only ${source.stock} remaining.`
        );
      }

      const ok = await takeStock(Product, p._id, source.mode, stone, size, item.qty);
      if (!ok) {
        return abortOrder(
          `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Someone else just bought it.`
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

    const cleanDiscountCode = discountCode?.trim().toUpperCase();
    if (cleanDiscountCode) {
      const disc = await Discount.findOne({
        code: cleanDiscountCode,
        active: true,
      });

      if (!disc) {
        return abortOrder('Invalid or expired promotional code');
      }

      const calc = computeDiscount(disc, subtotal, baseShipping.price);
      if (!calc.valid) {
        return abortOrder(calc.reason);
      }

      const claimed = await Discount.findOneAndUpdate(
        {
          _id: disc._id,
          active: true,
          $or: [{ limit: 0 }, { $expr: { $lt: ['$uses', '$limit'] } }],
        },
        { $inc: { uses: 1 } },
        { new: true }
      );
      if (!claimed) {
        return abortOrder('This discount code has reached its usage limit');
      }

      reservedDiscountId = claimed._id;
      discountAmount = calc.freeShipping ? 0 : calc.amount;
      freeShippingFromPromo = calc.freeShipping;
      appliedDiscountCode = calc.code;
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

    const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (requestedIdempotencyKey && mongoErr?.code === 11000) {
      const existing = await Order.findOne({ idempotencyKey: requestedIdempotencyKey })
        .lean()
        .catch(() => null);
      if (existing) {
        return NextResponse.json({
          success: true,
          orderNo: existing.orderNo,
          accessToken: existing.accessToken,
          message: 'Existing order retrieved',
        });
      }
    }

    await reportError(err, { area: 'checkout', route: '/api/orders', level: 'fatal' });
    return NextResponse.json(
      { error: 'An unexpected error occurred while placing your order. Please retry.' },
      { status: 500 }
    );
  }
}
