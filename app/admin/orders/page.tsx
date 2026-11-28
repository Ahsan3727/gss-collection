import Link from 'next/link';
import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { Order } from '@/lib/models/Order';
import { formatMoney } from '@/lib/money';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPagination from '@/components/admin/AdminPagination';
import type { OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 25;

interface OrdersPageProps {
  searchParams?: { status?: string; q?: string; page?: string };
}

function buildOrdersHref(opts: { status?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.q) params.set('q', opts.q);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : '/admin/orders';
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await requireAdminPage();
  const statusFilter = searchParams?.status || 'all';
  const queryParam = (searchParams?.q || '').trim();
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  await connectDB();
  const query: Record<string, unknown> = {};

  if (statusFilter !== 'all') {
    query.fulfil = statusFilter;
  }

  if (queryParam) {
    const regex = new RegExp(queryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { orderNo: regex },
      { 'contact.email': regex },
      { 'contact.phone': regex },
      { 'address.name': regex },
    ];
  }

  const [total, rawOrders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_LIMIT)
      .limit(PAGE_LIMIT)
      .lean(),
  ]);

  const orders = JSON.parse(JSON.stringify(rawOrders)) as OrderRecord[];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const endItem = Math.min(total, page * PAGE_LIMIT);

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
        return <span className="bg-emerald-100 text-ok text-xs px-2 py-0.5 rounded font-medium">Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-900 text-xs px-2 py-0.5 rounded font-medium">Shipped</span>;
      case 'processing':
        return <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded font-medium">Processing</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-error text-xs px-2 py-0.5 rounded font-medium">Cancelled</span>;
      default:
        return <span className="bg-neutral-200 text-ink text-xs px-2 py-0.5 rounded font-medium">Unfulfilled</span>;
    }
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Order Fulfillment"
        title={`Orders (${total})`}
        subtitle={
          total > 0 ? `Showing ${startItem}–${endItem} of ${total} · Page ${page} of ${totalPages}` : undefined
        }
      />

      {/* Search Form */}
      <form action="/admin/orders" method="GET" className="mb-4 flex flex-col sm:flex-row gap-2">
        {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
        <label htmlFor="admin-orders-search" className="sr-only">
          Search orders by number, customer name, email or phone
        </label>
        <input
          id="admin-orders-search"
          type="search"
          name="q"
          defaultValue={queryParam}
          placeholder="Search order #, name, email, or phone..."
          className="flex-1 min-w-0 px-3.5 min-h-[44px] bg-white border border-line text-base focus:outline-none focus:border-ink"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-ink text-white px-5 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800"
          >
            Search
          </button>
          {queryParam && (
            <Link
              href={buildOrdersHref({ status: statusFilter })}
              className="border border-line bg-white px-4 min-h-[44px] inline-flex items-center text-xs uppercase tracking-wider text-ink hover:border-ink"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Sticky horizontally-scrollable filter bar */}
      <div className="sticky top-14 md:top-16 z-20 -mx-4 px-4 py-2 bg-ground/95 backdrop-blur-sm mb-5 overflow-x-auto flex gap-2">
        {statuses.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildOrdersHref({ status: tab.value, q: queryParam, page: 1 })}
              className={`shrink-0 text-xs px-3.5 min-h-[44px] inline-flex items-center border transition ${
                isActive
                  ? 'bg-ink text-white border-ink font-semibold'
                  : 'bg-white border-line text-ink-2 hover:border-neutral-400'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white border border-line p-8 text-center text-sm text-ink-2">
            No orders found matching the filter criteria.
          </div>
        ) : (
          orders.map((o) => (
            <Link
              key={o._id || o.orderNo}
              href={`/admin/orders/${o.orderNo}`}
              className="block bg-white border border-line p-4 space-y-2 hover:border-ink transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-ink">{o.orderNo}</span>
                {getStatusBadge(o.fulfil)}
              </div>
              <div className="flex justify-between items-baseline text-xs text-ink-2">
                <div>
                  <span className="font-medium text-ink block">{o.address.name}</span>
                  <span>
                    {o.address.city} · {o.contact.phone}
                  </span>
                </div>
                <span className="font-bold text-sm text-ink">{formatMoney(o.total)}</span>
              </div>
              <div className="text-xs text-ink-2 flex justify-between pt-2 border-t border-line/60">
                <span className="uppercase">
                  {o.payMethod} ({o.payStatus})
                </span>
                <span className="font-semibold text-ink">Manage →</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase tracking-wider text-ink-2">
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
                <td colSpan={8} className="py-12 text-center text-ink-2">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id || o.orderNo} className="hover:bg-neutral-50/80 transition">
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
                    <span className="text-ink-2">{o.contact.phone}</span>
                  </td>
                  <td className="py-3.5 px-4 text-ink-2">{o.address.city}</td>
                  <td className="py-3.5 px-4">
                    <span className="uppercase font-medium block text-ink">{o.payMethod}</span>
                    <span
                      className={`capitalize ${
                        o.payStatus === 'paid' ? 'text-ok font-semibold' : 'text-gold'
                      }`}
                    >
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
                      className="text-xs uppercase tracking-wider font-semibold text-ink underline hover:text-ink-2"
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

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={PAGE_LIMIT}
        buildHref={(nextPage) =>
          buildOrdersHref({ status: statusFilter, q: queryParam, page: nextPage })
        }
      />
    </div>
  );
}
