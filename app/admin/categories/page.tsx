import Link from 'next/link';
import { getCategoriesWithCounts } from '@/lib/categories';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import CategoriesClient from '@/components/admin/CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Catalogue Structure"
        title={`Categories (${categories.length})`}
        subtitle="Create or rename shop categories and control how they appear in navigation and on the homepage."
        action={
          <Link
            href="/admin/products/new"
            className="bg-ink text-white px-5 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition"
          >
            New article / product
          </Link>
        }
      />

      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
