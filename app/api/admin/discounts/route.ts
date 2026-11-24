import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const discounts = await Discount.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ discounts });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load discounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { code, type, value, minOrder, limit } = await req.json();
    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Missing required discount fields' }, { status: 400 });
    }

    await connectDB();
    const newDiscount = await Discount.create({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      limit: Number(limit) || 0,
      active: true,
      uses: 0,
    });

    await logAdminAction(auth.user.email, 'discount_create', 'Discount', newDiscount.code);
    return NextResponse.json({ success: true, discount: newDiscount }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating discount code' }, { status: 400 });
  }
}
