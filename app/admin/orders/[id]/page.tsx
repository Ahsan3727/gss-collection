import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import OrderDetailClient from '@/components/admin/OrderDetailClient';

export const dynamic = 'force-dynamic';

interface OrderPageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage({ params }: OrderPageProps) {
  await connectDB();
  const order = await Order.findOne({
    $or: [{ orderNo: params.id.toUpperCase() }, { _id: params.id }],
  }).lean();

  if (!order) {
    notFound();
  }

  return <OrderDetailClient initialOrder={JSON.parse(JSON.stringify(order))} />;
}
