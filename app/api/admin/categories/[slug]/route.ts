import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminApi } from '@/lib/admin-auth';
import { ensureCategories } from '@/lib/categories';
import { parseCategoryWrite } from '@/lib/category-write';
import { Category } from '@/lib/models/Category';
import { Page } from '@/lib/models/Page';
import { Product } from '@/lib/models/Product';
import { logAdminAction } from '@/lib/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const lookupSlug = decodeURIComponent(params.slug).toLowerCase().trim();
    const parsed = parseCategoryWrite(await req.json());
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

    const category = await Category.findOne({ slug: lookupSlug });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const previousSlug = category.slug;
    if (parsed.data.slug !== previousSlug) {
      const taken = await Category.findOne({ slug: parsed.data.slug }).lean();
      if (taken) {
        return NextResponse.json(
          { error: 'A category with this web address already exists.' },
          { status: 409 }
        );
      }
    }

    category.set(parsed.data);
    await category.save();

    if (parsed.data.slug !== previousSlug) {
      await Product.updateMany({ cat: previousSlug }, { $set: { cat: parsed.data.slug } });
    }

    const productCount = await Product.countDocuments({ cat: category.slug });

    await logAdminAction(auth.user.email, 'category_update', 'Category', category.slug, {
      previousSlug,
      name: category.name,
    });

    revalidateTag('categories');
    revalidateTag('products');
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath(`/collections/${previousSlug}`);
    revalidatePath(`/collections/${category.slug}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({
      success: true,
      category: { ...JSON.parse(JSON.stringify(category)), productCount },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update category';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const auth = await requireAdminApi();
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const lookupSlug = decodeURIComponent(params.slug).toLowerCase().trim();
    await ensureCategories();

    const category = await Category.findOne({ slug: lookupSlug });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const productCount = await Product.countDocuments({ cat: category.slug });
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${category.name}" while ${productCount} product${
            productCount === 1 ? '' : 's'
          } still belong to it. Move those products to another category first, or mark the category hidden.`,
        },
        { status: 409 }
      );
    }

    await category.deleteOne();
    await logAdminAction(auth.user.email, 'category_delete', 'Category', category.slug, {
      name: category.name,
    });

    revalidateTag('categories');
    revalidateTag('products');
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath(`/collections/${category.slug}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Category DELETE Error]:', err);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
