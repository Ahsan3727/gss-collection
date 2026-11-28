import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { Page } from '@/lib/models/Page';
import PagesClient from '@/components/admin/PagesClient';

export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  await requireAdminPage();
  await connectDB();
  const pages = await Page.find().sort({ title: 1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2">
            Storefront Content
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">Content Pages</h1>
        </div>
      </div>

      <PagesClient initialPages={JSON.parse(JSON.stringify(pages))} />
    </div>
  );
}
