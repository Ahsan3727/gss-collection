import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Category } from '@/lib/models/Category';
import { Page } from '@/lib/models/Page';
import { requireAdminApi } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/models/AuditLog';
import { parsePageWrite } from '@/lib/page-write';
import { parseJsonBody } from '@/lib/http';
import { clientIpFromRequest } from '@/lib/ratelimit';

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
    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;
    const parsed = parsePageWrite(bodyResult.data);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();
    const page = await Page.findOne({ slug: params.slug });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const previousSlug = page.slug;

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

    if (page.slug !== previousSlug) {
      await Category.updateMany({ pageSlug: previousSlug }, { $set: { pageSlug: page.slug } });
    }

    await logAdminAction(
      auth.user.email,
      'page_update',
      'Page',
      page.slug,
      { title: page.title },
      clientIpFromRequest(req)
    );

    revalidateTag('pages');
    revalidateTag('categories');
    revalidateTag(`page:${previousSlug}`);
    revalidateTag(`page:${page.slug}`);
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ success: true, page: JSON.parse(JSON.stringify(page)) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update page';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
