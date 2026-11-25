import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';

export default function AdminNewProductPage() {
  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="border-b border-line pb-6 mb-8">
        <Link
          href="/admin/products"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2 hover:text-ink"
        >
          ← All products
        </Link>
        <h1 className="font-display text-3xl font-medium text-ink mt-2">New Product</h1>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
