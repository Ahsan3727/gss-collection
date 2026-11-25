import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { Discount } from '@/lib/models/Discount';
import { getNextOrderNumber } from '@/lib/models/Counter';
import { getStoreSettings } from '@/lib/settings';
import { resolveStockSource, takeStock, rollbackStock, type StockTaken } from '@/lib/stock';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  handle: z.string().optional(),
  title: z.string().optional(),
  stone: z.string().min(1),
  size: z.string().min(1),
  qty: z.number().int().min(1).max(10),
  // A `sku` sent by the browser is ignored. The server works it out from the stored variant.
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  contact: z.object({
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(8, 'Please enter a valid phone number'),
  }),
  address: z.object({
    name: z.string().min(2, 'Name is required'),
    line1: z.string().min(3, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().default('PK'),
  }),
  payMethod: z.enum(['cod', 'bank']),
  discountCode: z.string().optional(),
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  // Stock taken so far. If anything fails later, it is put back (see the catch block).
  const taken: StockTaken[] = [];

  try {
    const rawBody = await req.json();
    const parseResult = createOrderSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid order data';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { items, contact, address, payMethod, discountCode, note, idempotencyKey } = parseResult.data;

    await connectDB();

    // Check idempotency if key provided
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

    const settings = await getStoreSettings();

    // 1. Verify products, work out the price and SKU on the server, and take stock
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const p = await Product.findOne({
        $or: [{ id: item.productId }, { handle: item.productId }, { handle: item.handle }],
        status: 'active',
      });

      if (!p) {
        await rollbackStock(Product, taken);
        return NextResponse.json({ error: `Product "${item.title || item.productId}" is not available.` }, { status: 400 });
      }

      const stone = item.stone;
      const size = item.size;

      // Match the variant by stone and size. The SKU comes from the stored variant, never from the browser.
      const source = resolveStockSource(p, stone, size);

      if (source.mode === 'unavailable') {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          { error: `"${p.title}" is no longer available in ${stone}, Size ${size}. Please remove it from your bag.` },
          { status: 400 }
        );
      }

      const { sku, unitPrice } = source;

      if (source.stock < item.qty) {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          { error: `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Only ${source.stock} remaining.` },
          { status: 400 }
        );
      }

      // Atomic: only succeeds while enough stock is still there, so two buyers cannot take the last piece.
      const ok = await takeStock(Product, p._id, source.mode, stone, size, item.qty);
      if (!ok) {
        await rollbackStock(Product, taken);
        return NextResponse.json(
          { error: `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Someone else just bought it.` },
          { status: 400 }
        );
      }
      taken.push({ dbId: p._id, mode: source.mode, stone, size, qty: item.qty });

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

    // 2. Validate discount
    let discount = 0;
    let appliedDiscountCode: string | undefined = undefined;

    if (discountCode) {
      const disc = await Discount.findOne({
        code: discountCode.trim().toUpperCase(),
        active: true,
      });

      if (disc && subtotal >= disc.minOrder && (disc.limit === 0 || disc.uses < disc.limit)) {
        if (disc.type === 'pct') {
          discount = Math.round((subtotal * disc.value) / 100);
        } else if (disc.type === 'fixed') {
          discount = Math.min(subtotal, disc.value);
        } else if (disc.type === 'ship') {
          discount = 300;
        }
        disc.uses += 1;
        await disc.save();
        appliedDiscountCode = disc.code;
      }
    }

    // 3. Calculate delivery
    const freeShippingThreshold = settings.freeShippingFrom || 15000;
    const isFreeShipping = subtotal >= freeShippingThreshold || appliedDiscountCode === 'FREESHIP';
    const shipping = isFreeShipping ? 0 : 300;
    const shippingLabel = isFreeShipping ? 'Free standard delivery' : 'Standard delivery (Rs. 300)';
    const total = Math.max(0, subtotal - discount + shipping);

    // 4. Sequential order number & secure access token
    const orderNo = await getNextOrderNumber();
    const accessToken = crypto.randomBytes(18).toString('hex');

    // 5. Create Order document
    const order = await Order.create({
      orderNo,
      items: verifiedItems,
      subtotal,
      discount,
      discountCode: appliedDiscountCode,
      shipping,
      shippingLabel,
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

    return NextResponse.json({
      success: true,
      orderNo: order.orderNo,
      accessToken: order.accessToken,
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    await rollbackStock(Product, taken);
    return NextResponse.json(
      { error: 'An unexpected error occurred while placing your order. Please retry.' },
      { status: 500 }
    );
  }
}
