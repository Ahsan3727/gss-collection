import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';
import DiscountsClient from '@/components/admin/DiscountsClient';

export const dynamic = 'force-dynamic';

export default async function AdminDiscountsPage() {
  await connectDB();
  const discounts = await Discount.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Promotions & Marketing
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Discount Codes ({discounts.length})
          </h1>
        </div>
      </div>

      <DiscountsClient initialDiscounts={JSON.parse(JSON.stringify(discounts))} />
    </div>
  );
}
