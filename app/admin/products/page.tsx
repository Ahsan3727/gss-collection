import Link from 'next/link';
import Image from 'next/image';
import { connectDB } from '@/lib/db';
import { loadCategories } from '@/lib/categories';
import { Product } from '@/lib/models/Product';
import { formatMoney } from '@/lib/money';
import { totalProductStock } from '@/lib/pricing';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPagination from '@/components/admin/AdminPagination';
import type { ProductRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 25;

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-ok',
  draft: 'bg-amber-100 text-amber-900',
  archived: 'bg-neutral-200 text-ink-2',
};

interface AdminProductsPageProps {
  searchParams?: { status?: string; cat?: string; q?: string; page?: string };
}

function buildProductsHref(opts: { status?: string; cat?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.cat && opts.cat !== 'all') params.set('cat', opts.cat);
  if (opts.q) params.set('q', opts.q);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : '/admin/products';
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const statusFilter = searchParams?.status || 'all';
  const catFilter = (searchParams?.cat || 'all').toLowerCase();
  const queryParam = (searchParams?.q || '').trim();
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  await connectDB();
  const query: Record<string, unknown> = {};

  if (statusFilter !== 'all') {
    query.status = statusFilter;
  }
  if (catFilter !== 'all') {
    query.cat = catFilter;
  }
  if (queryParam) {
    const regex = new RegExp(queryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: regex }, { handle: regex }, { stones: regex }];
  }

  const [total, rawProducts, categories] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_LIMIT)
      .limit(PAGE_LIMIT)
      .lean(),
    loadCategories(true),
  ]);

  const catNameBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  const products = JSON.parse(JSON.stringify(rawProducts)) as ProductRecord[];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Catalogue Management"
        title={`Products (${total})`}
        action={
          <Link
            href="/admin/products/new"
            className="bg-ink text-white px-5 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition"
          >
            New product
          </Link>
        }
      />

      {/* Search & Status Filters */}
      <form action="/admin/products" method="GET" className="mb-4 flex flex-col sm:flex-row gap-2">
        {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
        {catFilter !== 'all' && <input type="hidden" name="cat" value={catFilter} />}
        <label htmlFor="admin-products-search" className="sr-only">
          Search products
        </label>
        <input
          id="admin-products-search"
          type="search"
          name="q"
          defaultValue={queryParam}
          placeholder="Search title, handle, or stone..."
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
              href={buildProductsHref({ status: statusFilter, cat: catFilter })}
              className="border border-line bg-white px-4 min-h-[44px] inline-flex items-center text-xs uppercase tracking-wider text-ink"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-3">
        {['all', 'active', 'draft', 'archived'].map((st) => (
          <Link
            key={st}
            href={buildProductsHref({ status: st, cat: catFilter, q: queryParam, page: 1 })}
            className={`text-xs uppercase px-3.5 min-h-[44px] inline-flex items-center border transition ${
              statusFilter === st
                ? 'bg-ink text-white border-ink font-semibold'
                : 'bg-white border-line text-ink-2 hover:border-ink'
            }`}
          >
            {st}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          href={buildProductsHref({ status: statusFilter, cat: 'all', q: queryParam, page: 1 })}
          className={`text-xs px-3 min-h-[44px] inline-flex items-center border transition ${
            catFilter === 'all'
              ? 'bg-ink text-white border-ink font-semibold'
              : 'bg-white border-line text-ink-2 hover:border-ink'
          }`}
        >
          All Categories
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={buildProductsHref({ status: statusFilter, cat: c.slug, q: queryParam, page: 1 })}
            className={`text-xs px-3 min-h-[44px] inline-flex items-center border transition ${
              catFilter === c.slug
                ? 'bg-ink text-white border-ink font-semibold'
                : 'bg-white border-line text-ink-2 hover:border-ink'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const totalStock = totalProductStock(p);
          const editHref = `/admin/products/${encodeURIComponent(p.id || p.handle)}`;
          return (
            <div key={p._id || p.id} className="bg-white border border-line p-4 flex gap-3.5 items-center">
              <div className="relative w-16 h-16 bg-ground border border-line overflow-hidden shrink-0">
                {p.photos && p.photos.length > 0 ? (
                  <Image src={p.photos[0]} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-ink-2">
                    GSS
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-sm text-ink truncate">{p.title}</h2>
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-0.5 rounded shrink-0 ${
                      STATUS_BADGE[p.status || 'active'] || 'bg-neutral-200 text-ink-2'
                    }`}
                  >
                    {p.status || 'active'}
                  </span>
                </div>
                <p className="text-xs text-ink-2 mt-1">
                  {formatMoney(p.base)} · {totalStock} in stock ({p.variants?.length || 0} variants)
                </p>
                <div className="mt-2">
                  <Link
                    href={editHref}
                    className="inline-flex items-center min-h-[44px] text-xs uppercase tracking-wider font-semibold text-ink underline"
                  >
                    Edit product →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Image</th>
              <th className="py-3 px-4 font-semibold">Product Title</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Base Price</th>
              <th className="py-3 px-4 font-semibold">Stones</th>
              <th className="py-3 px-4 font-semibold">Total Stock</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p._id || p.id} className="hover:bg-neutral-50/80 transition">
                <td className="py-3 px-4">
                  <div className="relative w-12 h-12 bg-ground border border-line overflow-hidden">
                    {p.photos && p.photos.length > 0 ? (
                      <Image src={p.photos[0]} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-ink-2">
                        GSS
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-ink block">{p.title}</span>
                  <span className="text-ink-2 font-mono">/products/{p.handle}</span>
                </td>
                <td className="py-3 px-4 text-ink-2">
                  {catNameBySlug.get(p.cat) || p.cat}{' '}
                  <span className="capitalize">({p.kind || 'ring'})</span>
                </td>
                <td className="py-3 px-4 font-semibold text-ink">{formatMoney(p.base)}</td>
                <td className="py-3 px-4 text-ink-2 capitalize">
                  {p.stones?.slice(0, 3).join(', ')}
                  {p.stones && p.stones.length > 3 ? '...' : ''}
                </td>
                <td className="py-3 px-4 text-ink font-semibold">
                  {totalProductStock(p)} ({p.variants?.length || 0} variants)
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                      STATUS_BADGE[p.status || 'active'] || 'bg-neutral-200 text-ink-2'
                    }`}
                  >
                    {p.status || 'active'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/admin/products/${encodeURIComponent(p.id || p.handle)}`}
                    className="text-xs uppercase tracking-wider font-semibold text-ink underline hover:text-ink-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={PAGE_LIMIT}
        buildHref={(nextPage) =>
          buildProductsHref({ status: statusFilter, cat: catFilter, q: queryParam, page: nextPage })
        }
      />
    </div>
  );
}
