import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { Discount } from '@/lib/models/Discount';
import { getNextOrderNumber } from '@/lib/models/Counter';
import { getStoreSettings } from '@/lib/settings';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  handle: z.string().optional(),
  title: z.string().optional(),
  stone: z.string().min(1),
  size: z.string().min(1),
  qty: z.number().int().min(1).max(10),
  sku: z.string().optional(),
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

    // 1. Verify products & calculate verified totals
    let subtotal = 0;
    const verifiedItems = [];
    const stockDeductions: { productId: string; sku: string; qty: number }[] = [];

    for (const item of items) {
      const p = await Product.findOne({
        $or: [{ id: item.productId }, { handle: item.productId }, { handle: item.handle }],
        status: 'active',
      });

      if (!p) {
        return NextResponse.json({ error: `Product "${item.title || item.productId}" is not available.` }, { status: 400 });
      }

      const stone = item.stone;
      const size = item.size;
      const sku = item.sku || `${p.handle.toUpperCase()}-${stone.toUpperCase()}-${size}`;

      // Check variant stock
      let availableStock = 0;
      let unitPrice = p.base;

      const variant = p.variants?.find((v: any) => v.stone === stone && v.size === size);
      if (variant) {
        availableStock = variant.stock;
        unitPrice = variant.price;
      } else {
        const delta = (p.stoneDeltas && (p.stoneDeltas as any)[stone]) || 0;
        unitPrice = p.base + delta;
        const key = `${stone}:${size}`;
        availableStock = (p.inventory && (p.inventory as any)[key]) ?? 0;
      }

      if (availableStock < item.qty) {
        return NextResponse.json(
          { error: `Insufficient stock for "${p.title}" (${stone}, Size ${size}). Only ${availableStock} remaining.` },
          { status: 400 }
        );
      }

      // Perform atomic decrement on variant
      const updateResult = await Product.updateOne(
        {
          _id: p._id,
          variants: { $elemMatch: { sku, stock: { $gte: item.qty } } },
        },
        {
          $inc: { 'variants.$.stock': -item.qty, sold: item.qty },
        }
      );

      // If variant array update didn't match (e.g. Legacy product with inventory Map), update inventory Map
      if (updateResult.modifiedCount === 0) {
        const invKey = `inventory.${stone}:${size}`;
        await Product.updateOne(
          { _id: p._id },
          { $inc: { [invKey]: -item.qty, sold: item.qty } }
        );
      }

      stockDeductions.push({ productId: p.id, sku, qty: item.qty });

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
    return NextResponse.json(
      { error: 'An unexpected error occurred while placing your order. Please retry.' },
      { status: 500 }
    );
  }
}
