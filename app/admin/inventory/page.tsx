import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import InventoryClient from '@/components/admin/InventoryClient';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  await connectDB();
  const products = await Product.find({ status: 'active' }).select('id handle title variants').lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Stock Management
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Variant Inventory Matrix
          </h1>
        </div>
      </div>

      <InventoryClient initialProducts={JSON.parse(JSON.stringify(products))} />
    </div>
  );
}
