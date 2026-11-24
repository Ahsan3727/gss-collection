import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface OrdersPageProps {
  searchParams?: { status?: string; q?: string };
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const statusFilter = searchParams?.status || 'all';
  const queryParam = searchParams?.q || '';

  await connectDB();
  const query: any = {};

  if (statusFilter !== 'all') {
    query.fulfil = statusFilter;
  }

  if (queryParam) {
    const regex = new RegExp(queryParam.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { orderNo: regex },
      { 'contact.email': regex },
      { 'contact.phone': regex },
      { 'address.name': regex },
    ];
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50).lean();

  const statuses = [
    { label: 'All Orders', value: 'all' },
    { label: 'Unfulfilled', value: 'unfulfilled' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const getStatusBadge = (fulfil: string) => {
    switch (fulfil) {
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded font-medium">Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded font-medium">Shipped</span>;
      case 'processing':
        return <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded font-medium">Processing</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-[11px] px-2 py-0.5 rounded font-medium">Cancelled</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-800 text-[11px] px-2 py-0.5 rounded font-medium">Unfulfilled</span>;
    }
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Order Fulfillment
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Orders Management
          </h1>
        </div>
        <span className="text-xs text-ink-3">
          Showing {orders.length} order{orders.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/orders?status=${tab.value}${queryParam ? `&q=${queryParam}` : ''}`}
              className={`text-xs px-3.5 py-2 border transition ${
                isActive
                  ? 'bg-ink text-white border-ink font-medium'
                  : 'bg-white border-line text-ink-2 hover:border-neutral-400'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase text-[10px] tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Order</th>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">City</th>
              <th className="py-3 px-4 font-semibold">Payment</th>
              <th className="py-3 px-4 font-semibold">Fulfillment</th>
              <th className="py-3 px-4 font-semibold text-right">Total</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-ink-3">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o._id.toString()} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3.5 px-4 font-semibold text-ink">
                    <Link href={`/admin/orders/${o.orderNo}`} className="hover:underline">
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-ink-2 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-ink block">{o.address.name}</span>
                    <span className="text-[11px] text-ink-3">{o.contact.phone}</span>
                  </td>
                  <td className="py-3.5 px-4 text-ink-2">{o.address.city}</td>
                  <td className="py-3.5 px-4">
                    <span className="uppercase font-medium text-[11px] block text-ink">
                      {o.payMethod}
                    </span>
                    <span className={`text-[10px] capitalize ${o.payStatus === 'paid' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}`}>
                      {o.payStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(o.fulfil)}</td>
                  <td className="py-3.5 px-4 font-semibold text-right text-ink">
                    {formatMoney(o.total)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${o.orderNo}`}
                      className="text-xs uppercase tracking-wider font-semibold text-ink underline hover:text-neutral-600"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
