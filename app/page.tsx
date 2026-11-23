import Link from 'next/link';
import ProductGrid from '@/components/store/ProductGrid';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';

export const dynamic = 'force-dynamic';

const FALLBACK_PRODUCTS = [
  {
    handle: 'crimson-halo-ring',
    title: 'Crimson Halo Ring',
    setting: 'cluster',
    base: 9800,
    compareAt: 11500,
    stones: ['garnet'],
    cat: 'ladies',
  },
  {
    handle: 'oval-cabochon-ring',
    title: 'Oval Cabochon Ring',
    setting: 'cabochon',
    base: 8500,
    stones: ['turquoise'],
    cat: 'ladies',
  },
  {
    handle: 'classic-solitaire-ring',
    title: 'Classic Solitaire Ring',
    setting: 'solitaire',
    base: 9200,
    stones: ['emerald'],
    cat: 'ladies',
  },
  {
    handle: 'heavy-signet-ring',
    title: 'Gents Heavy Signet Ring',
    setting: 'signet',
    base: 12500,
    stones: ['lapis'],
    cat: 'gents',
  },
];

async function getFeaturedProducts() {
  try {
    await connectDB();
    const products = await Product.find({ status: 'active' }).limit(8).lean();
    if (products && products.length > 0) {
      return JSON.parse(JSON.stringify(products));
    }
  } catch (err) {
    console.warn('DB not connected yet, using fallback products');
  }
  return FALLBACK_PRODUCTS;
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="pb-20">
      {/* Editorial Hero Banner */}
      <section className="relative bg-ink text-white overflow-hidden py-20 md:py-32">
        <div className="max-w-site mx-auto px-4 md:px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl text-center md:text-left">
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ice mb-3 block">
              Handcrafted in 925 Sterling Silver
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-normal tracking-tight leading-[1.08] mb-6">
              Natural untreated gemstones, set for a lifetime.
            </h1>
            <p className="text-neutral-300 text-base md:text-lg font-light leading-relaxed mb-8">
              Every ring is individually crafted with high-purity silver and natural mined stones. From bold signets to delicate solitaires.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                href="/collections/all"
                className="bg-white text-ink text-xs uppercase tracking-[0.18em] font-medium px-8 py-3.5 hover:bg-neutral-200 transition-colors"
              >
                Shop All Rings
              </Link>
              <Link
                href="/collections/gents"
                className="border border-white text-white text-xs uppercase tracking-[0.18em] font-medium px-8 py-3.5 hover:bg-white hover:text-ink transition-colors"
              >
                Gents Collection
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm aspect-square bg-neutral-900 border border-neutral-800 rounded-sm p-8 flex items-center justify-center">
            <div className="text-center">
              <span className="font-display text-3xl font-light tracking-widest uppercase block text-white mb-2">
                Pure Silver
              </span>
              <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
                Hallmarked 925
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Craftsmanship Bar */}
      <section className="border-b border-line py-8 bg-ground">
        <div className="max-w-site mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <h4 className="text-xs uppercase tracking-[0.16em] font-semibold text-ink mb-1">
              Solid 925 Silver
            </h4>
            <p className="text-[12px] text-ink-2">Never plated, guaranteed genuine</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.16em] font-semibold text-ink mb-1">
              Natural Gems
            </h4>
            <p className="text-[12px] text-ink-2">Authentic mined earth stones</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.16em] font-semibold text-ink mb-1">
              Cash on Delivery
            </h4>
            <p className="text-[12px] text-ink-2">Available across all Pakistan</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.16em] font-semibold text-ink mb-1">
              Free Delivery
            </h4>
            <p className="text-[12px] text-ink-2">On all orders above Rs. 15,000</p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <div className="max-w-site mx-auto px-4 md:px-6 pt-12">
        <ProductGrid
          products={products}
          title="Featured Pieces"
          subtitle="Recent Additions"
        />
      </div>

      {/* Collections Row */}
      <section className="max-w-site mx-auto px-4 md:px-6 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/collections/ladies"
            className="group block relative bg-ground p-10 border border-line hover:border-ink transition-all"
          >
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-2 block mb-2">
              For Her
            </span>
            <h3 className="font-display text-2xl font-medium text-ink mb-3 group-hover:underline">
              Ladies Rings
            </h3>
            <p className="text-sm text-ink-2">
              Solitaires, halo rings, and delicate everyday stacking bands.
            </p>
          </Link>

          <Link
            href="/collections/gents"
            className="group block relative bg-ground p-10 border border-line hover:border-ink transition-all"
          >
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-2 block mb-2">
              For Him
            </span>
            <h3 className="font-display text-2xl font-medium text-ink mb-3 group-hover:underline">
              Gents Rings
            </h3>
            <p className="text-sm text-ink-2">
              Classic signets, rectangle stones, and heavy solid bands.
            </p>
          </Link>

          <Link
            href="/collections/gems"
            className="group block relative bg-ground p-10 border border-line hover:border-ink transition-all"
          >
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-2 block mb-2">
              Untreated
            </span>
            <h3 className="font-display text-2xl font-medium text-ink mb-3 group-hover:underline">
              Natural Gems
            </h3>
            <p className="text-sm text-ink-2">
              Emeralds, sapphires, turquoise, and loose stones.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
