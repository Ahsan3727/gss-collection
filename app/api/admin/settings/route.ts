import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Settings } from '@/lib/models/Settings';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const settings = await Settings.findOne().lean();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    await connectDB();

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    if (body.storeName) settings.storeName = body.storeName;
    if (body.freeShippingFrom !== undefined) settings.freeShippingFrom = Number(body.freeShippingFrom);
    if (body.contact) {
      settings.contact = { ...settings.contact, ...body.contact };
    }
    if (body.bank) {
      settings.bank = { ...settings.bank, ...body.bank };
    }

    await settings.save();
    await logAdminAction(auth.user.email, 'settings_update', 'Settings', 'singleton', body);

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
