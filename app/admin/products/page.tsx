import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  await connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Catalogue Management
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Products ({products.length})
          </h1>
        </div>
      </div>

      <div className="bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase text-[10px] tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Image</th>
              <th className="py-3 px-4 font-semibold">Product Title</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Base Price</th>
              <th className="py-3 px-4 font-semibold">Available Stones</th>
              <th className="py-3 px-4 font-semibold">Variants</th>
              <th className="py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p: any) => (
              <tr key={p._id.toString()} className="hover:bg-neutral-50/80 transition">
                <td className="py-3 px-4">
                  <div className="relative w-12 h-12 bg-ground border border-line overflow-hidden">
                    {p.photos && p.photos.length > 0 ? (
                      <Image src={p.photos[0]} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-ink-3">GSS</div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-ink block">{p.title}</span>
                  <span className="text-[11px] text-ink-3 font-mono">/products/{p.handle}</span>
                </td>
                <td className="py-3 px-4 capitalize text-ink-2">{p.cat} ({p.kind || 'ring'})</td>
                <td className="py-3 px-4 font-semibold text-ink">{formatMoney(p.base)}</td>
                <td className="py-3 px-4 text-ink-2 capitalize">
                  {p.stones?.slice(0, 3).join(', ')}{p.stones?.length > 3 ? '...' : ''}
                </td>
                <td className="py-3 px-4 text-ink font-semibold">
                  {p.variants?.length || Object.keys(p.inventory || {}).length} variants
                </td>
                <td className="py-3 px-4">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase px-2 py-0.5 rounded">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
