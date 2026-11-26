import { connectDB } from '@/lib/db';
import { Discount } from '@/lib/models/Discount';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DiscountsClient from '@/components/admin/DiscountsClient';
import type { DiscountRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDiscountsPage() {
  await connectDB();
  const discounts = await Discount.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Promotions & Marketing"
        title={`Discount Codes (${discounts.length})`}
        subtitle="Create promo codes for percentage off, fixed PKR off, or free shipping."
      />

      <DiscountsClient initialDiscounts={JSON.parse(JSON.stringify(discounts)) as DiscountRecord[]} />
    </div>
  );
}
