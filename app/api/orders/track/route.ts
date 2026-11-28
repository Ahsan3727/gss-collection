import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`track:${ip}`, 20, 300);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset);
    }

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

    const cleanDigits = contact.replace(/\D/g, '');
    const phoneRegex = cleanDigits.length >= 9 ? new RegExp(`${cleanDigits.slice(-9)}$`) : null;

    const contactClauses: Record<string, unknown>[] = [{ 'contact.email': contact }];
    if (phoneRegex) {
      contactClauses.push({ 'contact.phone': { $regex: phoneRegex } });
    }

    const order = await Order.findOne({
      orderNo,
      $or: contactClauses,
    })
      .select(
        'orderNo items total subtotal shipping shippingLabel payMethod payStatus fulfil tracking timeline createdAt address.city address.country'
      )
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'No order found matching the provided order number and contact detail.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order: JSON.parse(JSON.stringify(order)) });
  } catch (err: unknown) {
    console.error('[Track Order API Error]:', err);
    return NextResponse.json({ error: 'Server error retrieving order status.' }, { status: 500 });
  }
}
