import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await connectDB();

  // Aggregate customers by email
  const customers = await Order.aggregate([
    {
      $group: {
        _id: '$contact.email',
        name: { $first: '$address.name' },
        phone: { $first: '$contact.phone' },
        city: { $first: '$address.city' },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        lastOrderDate: { $max: '$createdAt' },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Client Directory
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Customers ({customers.length})
          </h1>
        </div>
      </div>

      <div className="bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase text-[10px] tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Phone / WhatsApp</th>
              <th className="py-3 px-4 font-semibold">Location</th>
              <th className="py-3 px-4 font-semibold text-center">Orders</th>
              <th className="py-3 px-4 font-semibold text-right">Lifetime Spend</th>
              <th className="py-3 px-4 font-semibold text-right">Last Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ink-3">
                  No customer orders recorded yet.
                </td>
              </tr>
            ) : (
              customers.map((c: any) => (
                <tr key={c._id} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3.5 px-4 font-semibold text-ink">{c.name || 'Anonymous Client'}</td>
                  <td className="py-3.5 px-4 text-ink-2">{c._id}</td>
                  <td className="py-3.5 px-4 text-ink-2">{c.phone}</td>
                  <td className="py-3.5 px-4 text-ink-2">{c.city}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-ink">{c.orderCount}</td>
                  <td className="py-3.5 px-4 font-semibold text-right text-ink">{formatMoney(c.totalSpent)}</td>
                  <td className="py-3.5 px-4 text-right text-ink-3">
                    {new Date(c.lastOrderDate).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
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
