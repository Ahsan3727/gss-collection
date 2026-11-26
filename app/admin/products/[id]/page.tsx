import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { loadCategories } from '@/lib/categories';
import { Product } from '@/lib/models/Product';
import { productLookup, readDeltaMap } from '@/lib/product-write';
import ProductForm, { type ProductFormValues } from '@/components/admin/ProductForm';
import type { ProductRecord, ProductVariant } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KINDS = ['ring', 'bracelet', 'stone'];
const STATUSES = ['active', 'draft', 'archived'];

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  await connectDB();
  const [product, categories] = await Promise.all([
    Product.findOne(productLookup(params.id)).lean() as Promise<ProductRecord | null>,
    loadCategories(true),
  ]);

  if (!product) {
    notFound();
  }

  // Variants are what the shop and checkout read first, so they are the source for the stock table.
  const stock: Record<string, number> = {};
  const variants: ProductVariant[] = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    for (const variant of variants) {
      stock[`${variant.stone}:${variant.size}`] = Number(variant.stock) || 0;
    }
  } else {
    Object.assign(stock, readDeltaMap(product.inventory));
  }

  const initial: ProductFormValues = {
    title: product.title || '',
    handle: product.handle || '',
    cat: (product.cat || categories[0]?.slug || 'ladies').toLowerCase(),
    kind: product.kind && KINDS.includes(product.kind) ? product.kind : 'ring',
    desc: product.desc || '',
    base: product.base ? String(product.base) : '',
    compareAt: product.compareAt ? String(product.compareAt) : '',
    stones: Array.isArray(product.stones) ? product.stones.map(String) : [],
    sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : [],
    stock,
    status: product.status && STATUSES.includes(product.status) ? product.status : 'draft',
    photos: Array.isArray(product.photos) ? product.photos.map(String) : [],
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-2 hover:text-ink inline-flex items-center min-h-[44px]"
          >
            ← All products
          </Link>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">Edit Product</h1>
          <span className="text-xs text-ink-2 font-mono">/products/{product.handle}</span>
        </div>
        {product.status === 'active' && (
          <Link
            href={`/products/${product.handle}`}
            target="_blank"
            className="text-xs uppercase tracking-wider text-ink-2 hover:text-ink underline"
          >
            View in shop ↗
          </Link>
        )}
      </div>

      <ProductForm
        mode="edit"
        productId={product.id || product.handle}
        initial={initial}
        stoneDeltas={readDeltaMap(product.stoneDeltas)}
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          defaultKind: c.defaultKind,
        }))}
      />
    </div>
  );
}
