import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { AdminDiscountCreateSchema } from '@/lib/schemas';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const discounts = await Discount.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ discounts: JSON.parse(JSON.stringify(discounts)) });
  } catch {
    return NextResponse.json({ error: 'Failed to load discounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const rawBody: unknown = await req.json();
    const parsed = AdminDiscountCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Missing or invalid discount fields' },
        { status: 400 }
      );
    }

    const { code, type, value, minOrder, limit } = parsed.data;

    await connectDB();
    const newDiscount = await Discount.create({
      code: code.trim().toUpperCase(),
      type,
      value,
      minOrder,
      limit,
      active: true,
      uses: 0,
    });

    await logAdminAction(auth.user.email, 'discount_create', 'Discount', newDiscount.code);
    return NextResponse.json(
      { success: true, discount: JSON.parse(JSON.stringify(newDiscount)) },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating discount code';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
