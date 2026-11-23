import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { Discount } from '@/lib/models/Discount';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, contact, address, payMethod, discountCode, note } = body;

    if (!items || !items.length || !contact?.email || !address?.name || !address?.line1) {
      return NextResponse.json({ error: 'Missing required order fields.' }, { status: 400 });
    }

    await connectDB();

    // 1. Calculate and verify totals from DB
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const p = await Product.findOne({ id: item.productId, status: 'active' });
      if (!p) {
        return NextResponse.json({ error: `Product ${item.title} is no longer available.` }, { status: 400 });
      }

      // Check stock key
      const key = `${item.stone}:${item.size}`;
      const stock = p.inventory.get(key) ?? 10;
      if (stock < item.qty) {
        return NextResponse.json({ error: `Not enough stock for ${p.title} (${item.stone}, size ${item.size}).` }, { status: 400 });
      }

      const price = p.base;
      subtotal += price * item.qty;
      verifiedItems.push({
        productId: p.id,
        handle: p.handle,
        title: p.title,
        stone: item.stone,
        size: item.size,
        qty: item.qty,
        price,
      });

      // Atomically decrement stock
      p.inventory.set(key, Math.max(0, stock - item.qty));
      p.sold += item.qty;
      await p.save();
    }

    // 2. Check discount
    let discount = 0;
    if (discountCode) {
      const disc = await Discount.findOne({ code: discountCode.toUpperCase(), active: true });
      if (disc && subtotal >= disc.minOrder) {
        discount = disc.type === 'pct' ? Math.round((subtotal * disc.value) / 100) : disc.value;
        disc.uses += 1;
        await disc.save();
      }
    }

    // 3. Shipping rate
    const shipping = subtotal >= 15000 ? 0 : 300;
    const total = subtotal - discount + shipping;

    // 4. Generate order number
    const count = await Order.countDocuments();
    const orderNo = `GSS-${1001 + count}`;

    const order = await Order.create({
      orderNo,
      items: verifiedItems,
      subtotal,
      discount,
      discountCode: discountCode || undefined,
      shipping,
      shippingLabel: shipping === 0 ? 'Free standard delivery' : 'Standard delivery (Rs. 300)',
      total,
      payMethod: payMethod === 'bank' ? 'bank' : 'cod',
      payStatus: 'pending',
      fulfil: 'unfulfilled',
      contact,
      address,
      note,
      timeline: [{ at: new Date(), text: 'Order placed by customer' }],
    });

    return NextResponse.json({ success: true, orderNo: order.orderNo, orderId: order._id });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
