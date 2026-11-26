import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Settings } from '@/lib/models/Settings';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { DEFAULT_HERO } from '@/lib/settings';
import { HeroSettingsSchema } from '@/lib/types';

const settingsPatchSchema = z.object({
  storeName: z.string().min(1).max(120).optional(),
  tagline: z.string().max(240).optional(),
  freeShippingFrom: z.number().nonnegative().optional(),
  moderateReviews: z.boolean().optional(),
  announcements: z.array(z.string().max(240)).max(10).optional(),
  hero: HeroSettingsSchema.optional(),
  contact: z
    .object({
      email: z.string().max(160).optional(),
      phone: z.string().max(40).optional(),
      hours: z.string().max(120).optional(),
      address: z.string().max(300).optional(),
    })
    .optional(),
  bank: z
    .object({
      bankName: z.string().max(120).optional(),
      accountTitle: z.string().max(120).optional(),
      accountNumber: z.string().max(80).optional(),
    })
    .optional(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const settings = await Settings.findOne().lean();
    return NextResponse.json({ settings: JSON.parse(JSON.stringify(settings)) });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const rawBody: unknown = await req.json();
    const parsed = settingsPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid settings data' },
        { status: 400 }
      );
    }

    const body = parsed.data;
    await connectDB();

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    if (body.storeName !== undefined) settings.storeName = body.storeName;
    if (body.tagline !== undefined) settings.tagline = body.tagline;
    if (body.freeShippingFrom !== undefined) settings.freeShippingFrom = body.freeShippingFrom;
    if (body.moderateReviews !== undefined) settings.moderateReviews = body.moderateReviews;
    if (body.announcements !== undefined) settings.announcements = body.announcements;
    if (body.contact) {
      settings.contact = { ...settings.contact, ...body.contact };
    }
    if (body.bank) {
      settings.bank = { ...settings.bank, ...body.bank };
    }
    if (body.hero) {
      const existingHero = settings.hero ? JSON.parse(JSON.stringify(settings.hero)) : {};
      settings.hero = {
        ...DEFAULT_HERO,
        ...existingHero,
        ...body.hero,
      };
    }

    await settings.save();
    await logAdminAction(auth.user.email, 'settings_update', 'Settings', 'singleton', body);

    revalidateTag('settings');
    revalidatePath('/');

    return NextResponse.json({ success: true, settings: JSON.parse(JSON.stringify(settings)) });
  } catch (err: unknown) {
    console.error('[Settings PATCH Error]:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
