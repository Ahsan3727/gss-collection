import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ProductGrid from '@/components/store/ProductGrid';
import { getHomeFeaturedProducts } from '@/lib/catalogue';
import { formatMoney } from '@/lib/money';
import type { ProductRecord } from '@/lib/types';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'GSS Collection | 925 Sterling Silver Rings & Natural Gemstones',
  description:
    'Shop handcrafted 925 sterling silver rings for ladies and gents, set with untreated natural gemstones. Cash on delivery across Pakistan.',
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  let products: ProductRecord[] = [];
  let loadError = false;

  try {
    products = await getHomeFeaturedProducts();
  } catch (err) {
    console.error('[HomePage] Failed to load featured products:', err);
    loadError = true;
  }

  const spotlight = products.find((p) => p.photos && p.photos.length > 0) || products[0];
  const spotlightPhoto = spotlight?.photos?.[0];

  return (
    <div className="pb-16">
      {/* Mobile-first Editorial Hero with real product photography immediately visible */}
      <section className="bg-ink text-white py-8 md:py-16">
        <div className="max-w-site mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Hero product spotlight image: shown at top on phones so shoppers see real rings on screen 1 */}
          <div className="md:col-span-5 md:order-2">
            <Link
              href={spotlight ? `/products/${spotlight.handle}` : '/collections/all'}
              className="group block relative aspect-[4/3] sm:aspect-square w-full max-w-md mx-auto bg-neutral-900 border border-neutral-800 overflow-hidden"
            >
              {spotlightPhoto ? (
                <Image
                  src={spotlightPhoto}
                  alt={spotlight?.title || 'Handcrafted 925 sterling silver gemstone ring'}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 440px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <span className="font-display text-3xl tracking-widest uppercase text-white mb-2">
                    Pure Silver
                  </span>
                  <span className="text-xs tracking-[0.2em] text-neutral-300 uppercase">
                    Hallmarked 925
                  </span>
                </div>
              )}
              {spotlight && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end justify-between text-white">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-neutral-200 block">
                      Featured Piece
                    </span>
                    <span className="font-display text-lg font-medium">{spotlight.title}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(spotlight.base)}</span>
                </div>
              )}
            </Link>
          </div>

          <div className="md:col-span-7 md:order-1 text-center md:text-left">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-300 mb-2 block">
              Handcrafted in 925 Sterling Silver
            </span>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight leading-[1.08] mb-4">
              Natural untreated gemstones, set for a lifetime.
            </h1>
            <p className="text-neutral-200 text-sm sm:text-base md:text-lg font-light leading-relaxed mb-6 max-w-xl mx-auto md:mx-0">
              Individually crafted with hallmarked silver and earth-mined stones. From bold signets to delicate solitaires.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                href="/collections/all"
                className="bg-white text-ink text-xs uppercase tracking-[0.18em] font-semibold px-7 min-h-[48px] inline-flex items-center justify-center hover:bg-neutral-200 transition-colors"
              >
                Shop Collection
              </Link>
              <Link
                href="/collections/gents"
                className="border border-white text-white text-xs uppercase tracking-[0.18em] font-semibold px-7 min-h-[48px] inline-flex items-center justify-center hover:bg-white hover:text-ink transition-colors"
              >
                Gents Rings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products placed immediately after hero so product grid starts high */}
      <div className="max-w-site mx-auto px-4 md:px-6 pt-8 md:pt-12">
        {loadError ? (
          <div className="py-12 border border-line bg-ground text-center p-6 my-4">
            <p className="font-display text-2xl text-ink mb-2">Catalogue temporarily unavailable</p>
            <p className="text-sm text-ink-2">
              Please refresh in a moment to view our sterling silver jewellery.
            </p>
          </div>
        ) : (
          <ProductGrid
            products={products}
            title="Featured Pieces"
            subtitle="Recent Additions"
          />
        )}
      </div>

      {/* Collections Row */}
      <section aria-label="Browse categories" className="max-w-site mx-auto px-4 md:px-6 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/collections/ladies"
            className="group block bg-ground p-7 md:p-9 border border-line hover:border-ink transition-all min-h-[44px]"
          >
            <span className="text-xs tracking-[0.18em] uppercase text-ink-2 block mb-1.5">
              For Her
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2 group-hover:underline">
              Ladies Rings
            </h2>
            <p className="text-sm text-ink-2">
              Solitaires, halo rings, and delicate everyday stacking bands.
            </p>
          </Link>

          <Link
            href="/collections/gents"
            className="group block bg-ground p-7 md:p-9 border border-line hover:border-ink transition-all min-h-[44px]"
          >
            <span className="text-xs tracking-[0.18em] uppercase text-ink-2 block mb-1.5">
              For Him
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2 group-hover:underline">
              Gents Rings
            </h2>
            <p className="text-sm text-ink-2">
              Classic signets, rectangle stones, and heavy solid bands.
            </p>
          </Link>

          <Link
            href="/collections/gems"
            className="group block bg-ground p-7 md:p-9 border border-line hover:border-ink transition-all min-h-[44px]"
          >
            <span className="text-xs tracking-[0.18em] uppercase text-ink-2 block mb-1.5">
              Untreated
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2 group-hover:underline">
              Natural Gems
            </h2>
            <p className="text-sm text-ink-2">
              Emeralds, sapphires, turquoise, and loose specimen stones.
            </p>
          </Link>
        </div>
      </section>

      {/* Compact Trust & Craftsmanship Bar */}
      <section aria-label="Store guarantees" className="max-w-site mx-auto px-4 md:px-6 mt-14">
        <div className="border border-line bg-ground grid grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-8 text-center">
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-ink mb-1">
              Solid 925 Silver
            </h2>
            <p className="text-xs text-ink-2">Never plated, hallmarked purity</p>
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-ink mb-1">
              Natural Gems
            </h2>
            <p className="text-xs text-ink-2">Authentic mined earth stones</p>
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-ink mb-1">
              Cash on Delivery
            </h2>
            <p className="text-xs text-ink-2">Available nationwide in Pakistan</p>
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] font-semibold text-ink mb-1">
              Insured Dispatch
            </h2>
            <p className="text-xs text-ink-2">Velvet gift box &amp; tracking</p>
          </div>
        </div>
      </section>
    </div>
  );
}
