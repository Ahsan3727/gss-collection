import Link from 'next/link';
import { loadCategories } from '@/lib/categories';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function AdminNewProductPage({
  searchParams,
}: {
  searchParams?: { cat?: string };
}) {
  const categories = (await loadCategories(true)).filter((c) => c.targetType !== 'page');
  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    defaultKind: c.defaultKind,
  }));

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="border-b border-line pb-6 mb-8">
        <Link
          href="/admin/products"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2 hover:text-ink inline-flex items-center min-h-[44px]"
        >
          ← All products
        </Link>
        <h1 className="font-display text-3xl font-medium text-ink mt-2">New Product / Article</h1>
      </div>

      <ProductForm
        mode="create"
        categories={categoryOptions}
        initialCat={searchParams?.cat?.toLowerCase().trim()}
      />
    </div>
  );
}
