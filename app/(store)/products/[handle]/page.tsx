import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import ProductDetailClient from '@/components/store/ProductDetailClient';
import ProductGrid from '@/components/store/ProductGrid';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: { handle: string };
}

async function getProduct(handle: string) {
  try {
    await connectDB();
    const p = await Product.findOne({ handle, status: 'active' }).lean();
    if (p) return JSON.parse(JSON.stringify(p));
  } catch (err) {
    console.error('[Product Detail] DB read failed:', err);
  }
  return null;
}

async function getRelatedProducts(cat: string, currentHandle: string) {
  try {
    await connectDB();
    const related = await Product.find({
      cat,
      handle: { $ne: currentHandle },
      status: 'active',
    })
      .limit(4)
      .lean();
    return JSON.parse(JSON.stringify(related || []));
  } catch (err) {
    return [];
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct(params.handle);
  if (!product) {
    return { title: 'Piece Not Found | GSS Collection' };
  }
  return {
    title: `${product.title} | GSS Collection`,
    description: product.desc || `Handcrafted ${product.title} in 925 sterling silver with natural gemstones.`,
    openGraph: {
      title: `${product.title} | GSS Collection`,
      description: product.desc,
      images: product.photos?.[0] ? [{ url: product.photos[0] }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProduct(params.handle);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product.cat, product.handle);

  // JSON-LD structured schema for search engines
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.photos?.[0] || '',
    description: product.desc,
    sku: product.handle,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: product.base,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main product purchase controls */}
      <ProductDetailClient product={product} />

      {/* Related pieces */}
      {related.length > 0 && (
        <div className="mt-24 pt-16 border-t border-line">
          <div className="flex justify-between items-baseline mb-8">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-ink-2 font-medium block mb-1">
                Complementary Pieces
              </span>
              <h2 className="font-display text-2xl md:text-3xl text-ink font-normal">
                You May Also Admire
              </h2>
            </div>
          </div>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
