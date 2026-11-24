import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Page } from '@/lib/models/Page';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { parsePageWrite } from '@/lib/page-write';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    await connectDB();
    const page = await Page.findOne({ slug: params.slug }).lean();
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json({ page: JSON.parse(JSON.stringify(page)) });
  } catch (err) {
    console.error('[Page API Error]:', err);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const parsed = parsePageWrite(await req.json());
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();
    const page = await Page.findOne({ slug: params.slug });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (parsed.data.slug !== page.slug) {
      const taken = await Page.findOne({ slug: parsed.data.slug }).lean();
      if (taken) {
        return NextResponse.json({ error: 'A page with this slug already exists.' }, { status: 409 });
      }
    }

    page.slug = parsed.data.slug;
    page.title = parsed.data.title;
    page.body = parsed.data.body;
    page.metaDesc = parsed.data.metaDesc;
    await page.save();

    await logAdminAction(auth.user.email, 'page_update', 'Page', page.slug, {
      title: page.title,
    });

    return NextResponse.json({ success: true, page: JSON.parse(JSON.stringify(page)) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update page' }, { status: 500 });
  }
}
