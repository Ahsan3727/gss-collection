import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';
import { loadSettings } from '@/lib/settings';
import { computeDiscount, resolveShippingOption } from '@/lib/pricing';
import { DiscountValidateInputSchema } from '@/lib/schemas';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = await rateLimit(`discount:${ip}`, 20, 300);
    if (!limit.success) {
      return rateLimitExceededResponse(limit.reset, 'Too many discount attempts. Please wait a few minutes.');
    }

    const rawBody: unknown = await req.json();
    const parsed = DiscountValidateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Please enter a discount code' },
        { status: 400 }
      );
    }

    const { code, subtotal, country = 'PK', shippingMethodId = 'std' } = parsed.data;

    await connectDB();
    const [discount, settings] = await Promise.all([
      Discount.findOne({
        code: code.trim().toUpperCase(),
        active: true,
      }).lean(),
      loadSettings(),
    ]);

    if (!discount) {
      return NextResponse.json({ error: 'Invalid or expired promotional code' }, { status: 404 });
    }

    const baseShipping = resolveShippingOption(settings, subtotal, country, shippingMethodId, false);
    const calc = computeDiscount(discount, subtotal, baseShipping.price);

    if (!calc.valid) {
      return NextResponse.json({ error: calc.reason }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: calc.code,
      type: calc.type,
      value: discount.value,
      discountAmount: calc.amount,
      freeShipping: calc.freeShipping,
    });
  } catch (err: unknown) {
    console.error('[Discount Validate Error]:', err);
    return NextResponse.json({ error: 'Failed to validate discount code' }, { status: 500 });
  }
}
