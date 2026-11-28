import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { getCategoriesWithCounts } from '@/lib/categories';
import { Page } from '@/lib/models/Page';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import CategoriesClient from '@/components/admin/CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  await connectDB();
  const [categories, rawPages] = await Promise.all([
    getCategoriesWithCounts(),
    Page.find().sort({ title: 1 }).select('slug title').lean(),
  ]);

  const availablePages = JSON.parse(JSON.stringify(rawPages || [])) as {
    slug: string;
    title: string;
  }[];

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Catalogue Structure"
        title={`Categories (${categories.length})`}
        subtitle="Create product collections or link CMS pages (like Size Guide) directly into navigation."
        action={
          <Link
            href="/admin/products/new"
            className="bg-ink text-white px-5 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition"
          >
            New article / product
          </Link>
        }
      />

      <CategoriesClient initialCategories={categories} availablePages={availablePages} />
    </div>
  );
}
