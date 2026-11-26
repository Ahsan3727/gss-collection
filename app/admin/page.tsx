import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { Product } from '@/lib/models/Product';
import { Message } from '@/lib/models/Message';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  try {
    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10).lean();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalMessages = await Message.countDocuments({ read: false });

    const revenueAgg = await Order.aggregate([
      { $match: { fulfil: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    return {
      orders: JSON.parse(JSON.stringify(orders)),
      totalOrders,
      totalProducts,
      totalMessages,
      totalRevenue,
    };
  } catch (err) {
    console.error('[Admin] Error fetching dashboard stats:', err);
    return {
      orders: [],
      totalOrders: 0,
      totalProducts: 0,
      totalMessages: 0,
      totalRevenue: 0,
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex items-baseline justify-between border-b border-line pb-6 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2">
            Store Administration
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Dashboard Overview
          </h1>
        </div>
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-ink-2 hover:text-ink underline min-h-[44px] inline-flex items-center"
        >
          View Storefront →
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-ground border border-line p-6">
          <span className="text-xs uppercase tracking-wider text-ink-2 block mb-1">
            Total Revenue
          </span>
          <span className="text-2xl font-bold text-ink">
            {formatMoney(stats.totalRevenue)}
          </span>
        </div>
        <div className="bg-ground border border-line p-6">
          <span className="text-xs uppercase tracking-wider text-ink-2 block mb-1">
            Total Orders
          </span>
          <span className="text-2xl font-bold text-ink">
            {stats.totalOrders}
          </span>
        </div>
        <div className="bg-ground border border-line p-6">
          <span className="text-xs uppercase tracking-wider text-ink-2 block mb-1">
            Active Products
          </span>
          <span className="text-2xl font-bold text-ink">
            {stats.totalProducts}
          </span>
        </div>
        <div className="bg-ground border border-line p-6">
          <span className="text-xs uppercase tracking-wider text-ink-2 block mb-1">
            Unread Inquiries
          </span>
          <span className="text-2xl font-bold text-ink">
            {stats.totalMessages}
          </span>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="border border-line">
        <div className="p-5 border-b border-line flex justify-between items-center bg-ground">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
            Recent Orders
          </h2>
          <span className="text-xs text-ink-2">
            Showing latest {stats.orders.length} orders
          </span>
        </div>

        {stats.orders.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-2">
            No customer orders placed yet.
          </div>
        ) : (
          <div>
            <div className="md:hidden divide-y divide-line">
              {stats.orders.map(
                (o: {
                  _id: string;
                  orderNo: string;
                  address?: { name?: string };
                  contact?: { phone?: string };
                  fulfil: string;
                  payMethod: string;
                  total: number;
                }) => (
                  <Link
                    key={o._id}
                    href={`/admin/orders/${encodeURIComponent(o.orderNo)}`}
                    className="block p-4 hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink text-sm">{o.orderNo}</span>
                      <span className="font-semibold text-ink text-sm">{formatMoney(o.total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-2 mt-1">
                      <span>{o.address?.name || o.contact?.phone || 'Customer'}</span>
                      <span className="px-2 py-0.5 bg-neutral-200 text-ink rounded text-xs uppercase font-semibold">
                        {o.fulfil}
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-ink-2 uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="p-3.5 font-semibold">Order</th>
                    <th className="p-3.5 font-semibold">Customer</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Payment</th>
                    <th className="p-3.5 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.orders.map(
                    (o: {
                      _id: string;
                      orderNo: string;
                      address?: { name?: string };
                      contact?: { phone?: string };
                      fulfil: string;
                      payMethod: string;
                      total: number;
                    }) => (
                      <tr key={o._id} className="hover:bg-neutral-50">
                        <td className="p-3.5 font-semibold text-ink">
                          <Link
                            href={`/admin/orders/${encodeURIComponent(o.orderNo)}`}
                            className="underline hover:text-ink-2"
                          >
                            {o.orderNo}
                          </Link>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-ink">{o.address?.name}</div>
                          <div className="text-ink-2">{o.contact?.phone}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block px-2 py-0.5 bg-neutral-200 text-ink rounded text-xs uppercase font-semibold">
                            {o.fulfil}
                          </span>
                        </td>
                        <td className="p-3.5 capitalize text-ink-2">{o.payMethod}</td>
                        <td className="p-3.5 text-right font-semibold text-ink">
                          {formatMoney(o.total)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
