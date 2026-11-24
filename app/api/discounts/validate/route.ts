import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please enter a discount code' }, { status: 400 });
    }

    await connectDB();
    const discount = await Discount.findOne({
      code: code.trim().toUpperCase(),
      active: true,
    }).lean();

    if (!discount) {
      return NextResponse.json({ error: 'Invalid or expired promotional code' }, { status: 404 });
    }

    if (discount.limit > 0 && discount.uses >= discount.limit) {
      return NextResponse.json({ error: 'This discount code has reached its usage limit' }, { status: 400 });
    }

    const currentSubtotal = Number(subtotal) || 0;
    if (discount.minOrder > 0 && currentSubtotal < discount.minOrder) {
      return NextResponse.json(
        { error: `Minimum order amount of Rs. ${discount.minOrder.toLocaleString()} required for this code` },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (discount.type === 'pct') {
      discountAmount = Math.round((currentSubtotal * discount.value) / 100);
    } else if (discount.type === 'fixed') {
      discountAmount = Math.min(currentSubtotal, discount.value);
    } else if (discount.type === 'ship') {
      discountAmount = 300; // Free shipping
    }

    return NextResponse.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to validate discount code' }, { status: 500 });
  }
}
