import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-auth';
import { Order } from '@/lib/models/Order';
import { formatMoney } from '@/lib/money';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPagination from '@/components/admin/AdminPagination';
import type { CustomerSummaryRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 25;

interface CustomersPageProps {
  searchParams?: { q?: string; page?: string };
}

interface CustomersPageResult {
  customers: CustomerSummaryRecord[];
  total: number;
}

const fetchCustomersCached = unstable_cache(
  async (q: string, page: number, limit: number): Promise<CustomersPageResult> => {
    await connectDB();
    const trimmed = q.trim();
    const matchStage: Record<string, unknown> = trimmed
      ? {
          $or: [
            { 'contact.phone': new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
            { 'address.name': new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
            { 'address.city': new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          ],
        }
      : {};

    const skip = (page - 1) * limit;
    const agg = await Order.aggregate<{
      meta: Array<{ total: number }>;
      data: Array<{
        _id: string;
        name: string;
        phone: string;
        city: string;
        orderCount: number;
        totalSpent: number;
        lastOrderDate: Date | string;
      }>;
    }>([
      ...(trimmed ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$contact.phone',
          name: { $last: '$address.name' },
          phone: { $last: '$contact.phone' },
          city: { $last: '$address.city' },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpent: -1, lastOrderDate: -1 } },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const first = agg[0] || { meta: [], data: [] };
    const total = first.meta[0]?.total ?? 0;
    const customers: CustomerSummaryRecord[] = first.data.map((c) => ({
      _id: String(c._id || ''),
      name: String(c.name || ''),
      phone: String(c.phone || ''),
      city: String(c.city || ''),
      orderCount: Number(c.orderCount || 0),
      totalSpent: Number(c.totalSpent || 0),
      lastOrderDate: c.lastOrderDate ? new Date(c.lastOrderDate).toISOString() : '',
    }));

    return { customers, total };
  },
  ['admin-customers-list'],
  { tags: ['orders'], revalidate: 120 }
);

function buildCustomersHref(opts: { q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/customers?${qs}` : '/admin/customers';
}

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdminPage();
  const queryParam = (searchParams?.q || '').trim();
  const requestedPage = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  let data: CustomersPageResult = { customers: [], total: 0 };
  let loadError = '';

  try {
    data = await fetchCustomersCached(queryParam, requestedPage, PAGE_LIMIT);
  } catch (err) {
    console.error('[Admin Customers Error]:', err);
    loadError = 'Could not load customer directory right now.';
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_LIMIT));
  const currentPage = Math.min(requestedPage, totalPages);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Customer Directory"
        title={`Customers (${data.total})`}
        subtitle="Aggregated by phone across orders."
      />

      <form
        action="/admin/customers"
        method="GET"
        className="flex flex-col sm:flex-row gap-2 mb-6"
      >
        <label htmlFor="customer-search" className="sr-only">
          Search customers by name, phone or city
        </label>
        <input
          id="customer-search"
          type="search"
          name="q"
          defaultValue={queryParam}
          placeholder="Search name, phone, or city..."
          className="flex-1 min-w-0 px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-5 min-h-[44px] bg-ink text-white text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800"
          >
            Search
          </button>
          {queryParam && (
            <Link
              href="/admin/customers"
              className="px-4 min-h-[44px] inline-flex items-center border border-line text-xs uppercase tracking-wider font-semibold text-ink-2 hover:border-ink"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {loadError && (
        <p role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 text-xs font-medium">
          {loadError}
        </p>
      )}

      {data.customers.length === 0 ? (
        <div className="bg-white border border-line p-10 text-center text-xs text-ink-2">
          {queryParam ? `No customers matching "${queryParam}".` : 'No customers recorded yet.'}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {data.customers.map((c) => (
              <div key={c._id} className="bg-white border border-line p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink text-sm truncate">{c.name || 'Customer'}</div>
                    <div className="font-mono text-xs text-ink-2 mt-0.5">{c.phone}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-ink text-sm">{formatMoney(c.totalSpent)}</div>
                    <div className="text-xs text-ink-2">
                      {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-2 pt-2 border-t border-line">
                  <span>{c.city}</span>
                  <span>
                    {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-PK') : '—'}
                  </span>
                </div>
                <div className="pt-1">
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(c.phone)}`}
                    className="inline-flex items-center min-h-[44px] text-xs font-semibold uppercase tracking-wider underline text-ink"
                  >
                    View Orders
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-line overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-ink-2 uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="p-3.5 font-semibold">Customer Name</th>
                  <th className="p-3.5 font-semibold">Phone</th>
                  <th className="p-3.5 font-semibold">City</th>
                  <th className="p-3.5 font-semibold text-center">Orders</th>
                  <th className="p-3.5 font-semibold text-right">Lifetime Value</th>
                  <th className="p-3.5 font-semibold text-right">Last Order</th>
                  <th className="p-3.5 font-semibold text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.customers.map((c) => (
                  <tr key={c._id} className="hover:bg-neutral-50">
                    <td className="p-3.5 font-medium text-ink">{c.name || 'Customer'}</td>
                    <td className="p-3.5 font-mono text-ink-2">{c.phone}</td>
                    <td className="p-3.5 text-ink-2">{c.city}</td>
                    <td className="p-3.5 text-center font-semibold">{c.orderCount}</td>
                    <td className="p-3.5 text-right font-semibold text-ink">{formatMoney(c.totalSpent)}</td>
                    <td className="p-3.5 text-right text-ink-2">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-PK') : '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(c.phone)}`}
                        className="underline text-ink hover:text-ink-2 font-medium"
                      >
                        Orders
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminPagination
        page={currentPage}
        totalPages={totalPages}
        total={data.total}
        limit={PAGE_LIMIT}
        buildHref={(nextPage) => buildCustomersHref({ q: queryParam || undefined, page: nextPage })}
      />
    </div>
  );
}
