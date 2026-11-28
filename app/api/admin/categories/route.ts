import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminApi } from '@/lib/admin-auth';
import { ensureCategories, getCategoriesWithCounts } from '@/lib/categories';
import { parseCategoryWrite } from '@/lib/category-write';
import { Category } from '@/lib/models/Category';
import { Page } from '@/lib/models/Page';
import { logAdminAction } from '@/lib/models/AuditLog';
import { parseJsonBody } from '@/lib/http';
import { clientIpFromRequest } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const categories = await getCategoriesWithCounts();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('[Categories GET Error]:', err);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const bodyResult = await parseJsonBody(req);
    if ('errorResponse' in bodyResult) return bodyResult.errorResponse;
    const parsed = parseCategoryWrite(bodyResult.data);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await ensureCategories();
    if (parsed.data.pageSlug) {
      const pageExists = await Page.exists({ slug: parsed.data.pageSlug });
      if (!pageExists) {
        return NextResponse.json(
          { error: `Linked page "/pages/${parsed.data.pageSlug}" does not exist. Create it in Pages first.` },
          { status: 400 }
        );
      }
    }

    const existing = await Category.findOne({ slug: parsed.data.slug }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this web address already exists.' },
        { status: 409 }
      );
    }

    const created = await Category.create(parsed.data);
    await logAdminAction(
      auth.user.email,
      'category_create',
      'Category',
      created.slug,
      { name: created.name },
      clientIpFromRequest(req)
    );

    revalidateTag('categories');
    revalidateTag('products');
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath(`/collections/${created.slug}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json(
      {
        success: true,
        category: { ...JSON.parse(JSON.stringify(created)), productCount: 0 },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create category';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
