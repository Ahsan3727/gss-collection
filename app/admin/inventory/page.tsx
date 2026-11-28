import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { Product } from '@/lib/models/Product';
import InventoryClient, { type InventoryProductItem } from '@/components/admin/InventoryClient';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  await requireAdminPage();
  await connectDB();
  const rawProducts = await Product.find({ status: 'active' })
    .select('id handle title variants')
    .lean();

  const products = JSON.parse(JSON.stringify(rawProducts)) as InventoryProductItem[];

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Stock Management"
        title="Variant Inventory Matrix"
        subtitle="Changes go live on the storefront immediately after saving."
      />
      <InventoryClient initialProducts={products} />
    </div>
  );
}
