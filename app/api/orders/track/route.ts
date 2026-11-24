import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNo = (searchParams.get('orderNo') || '').trim().toUpperCase();
    const contact = (searchParams.get('contact') || '').trim().toLowerCase();

    if (!orderNo || !contact) {
      return NextResponse.json(
        { error: 'Please provide both your Order Number and Email / Phone.' },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findOne({
      orderNo,
      $or: [
        { 'contact.email': contact },
        { 'contact.phone': { $regex: new RegExp(contact.replace(/\D/g, '') || contact, 'i') } },
      ],
    })
      .select('orderNo items total subtotal shipping shippingLabel payMethod payStatus fulfil tracking timeline createdAt address.city address.country')
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'No order found matching the provided order number and contact detail.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error('[Track Order API Error]:', err);
    return NextResponse.json({ error: 'Server error retrieving order status.' }, { status: 500 });
  }
}
