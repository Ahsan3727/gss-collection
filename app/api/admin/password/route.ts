import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';
import { AdminUser } from '@/lib/models/AdminUser';
import { logAdminAction } from '@/lib/models/AuditLog';
import { AdminPasswordChangeSchema } from '@/lib/schemas';
import { parseJsonBody } from '@/lib/http';
import { clientIpFromRequest, rateLimit, rateLimitExceededResponse } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  const ip = clientIpFromRequest(req);
  const limit = await rateLimit(`admin:pw:${auth.user.email}`, 5, 900);
  if (!limit.success) {
    return rateLimitExceededResponse(limit.reset, 'Too many password change attempts. Please retry later.');
  }

  const bodyResult = await parseJsonBody(req);
  if ('errorResponse' in bodyResult) return bodyResult.errorResponse;

  const parsed = AdminPasswordChangeSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid password payload' },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const user = await AdminUser.findOne({ email: auth.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    await logAdminAction(
      auth.user.email,
      'admin_password_changed',
      'AdminUser',
      user.id,
      undefined,
      ip
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Admin Password Change Error]:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
