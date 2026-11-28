import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { Order, orderLookup } from '@/lib/models/Order';
import OrderDetailClient from '@/components/admin/OrderDetailClient';

export const dynamic = 'force-dynamic';

interface OrderPageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage({ params }: OrderPageProps) {
  await requireAdminPage();
  await connectDB();
  const order = await Order.findOne(orderLookup(params.id)).lean();

  if (!order) {
    notFound();
  }

  return <OrderDetailClient initialOrder={JSON.parse(JSON.stringify(order))} />;
}
