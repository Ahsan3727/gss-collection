import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Page } from '@/lib/models/Page';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { parsePageWrite } from '@/lib/page-write';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const pages = await Page.find().sort({ title: 1 }).lean();
    return NextResponse.json({ pages: JSON.parse(JSON.stringify(pages)) });
  } catch (err) {
    console.error('[Pages API Error]:', err);
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const parsed = parsePageWrite(await req.json());
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();
    const existing = await Page.findOne({ slug: parsed.data.slug }).lean();
    if (existing) {
      return NextResponse.json({ error: 'A page with this slug already exists.' }, { status: 409 });
    }

    const page = await Page.create(parsed.data);
    await logAdminAction(auth.user.email, 'page_create', 'Page', page.slug, {
      title: page.title,
    });

    revalidateTag('pages');
    revalidateTag(`page:${page.slug}`);

    return NextResponse.json({ success: true, page: JSON.parse(JSON.stringify(page)) }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create page';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
