import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ProductGrid from '@/components/store/ProductGrid';
import { getHomeCategoryShowcases } from '@/lib/catalogue';
import { formatMoney } from '@/lib/money';
import { getStoreSettings } from '@/lib/settings';
import { DEFAULT_HERO, type HomeCategoryShowcase } from '@/lib/types';

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
  const [settings, showcasesResult] = await Promise.all([
    getStoreSettings(),
    getHomeCategoryShowcases()
      .then((data) => ({ data, error: false as const }))
      .catch((err) => {
        console.error('[HomePage] Failed to load category showcases:', err);
        return { data: [] as HomeCategoryShowcase[], error: true as const };
      }),
  ]);

  const showcases = showcasesResult.data;
  const loadError = showcasesResult.error;
  const hero = settings.hero ?? DEFAULT_HERO;
  const secondaryCategory = showcases.find((s) => s.handle !== 'ladies') || showcases[0];

  const allHomeProducts = showcases.flatMap((s) => s.products);
  const spotlight =
    allHomeProducts.find((p) => p.photos && p.photos.length > 0) || allHomeProducts[0];
  const hasCustomHeroImage = Boolean(hero.imageUrl && hero.imageUrl.trim().length > 0);
  const heroImageSrc = hasCustomHeroImage ? hero.imageUrl.trim() : spotlight?.photos?.[0];
  const heroImageAlt = hasCustomHeroImage
    ? hero.imageAlt?.trim() || hero.headline
    : spotlight?.title || 'Handcrafted 925 sterling silver gemstone ring';
  const heroLinkHref = hasCustomHeroImage
    ? hero.linkHref?.trim() || '/collections/all'
    : spotlight
      ? `/products/${spotlight.handle}`
      : '/collections/all';

  return (
    <div className="pb-16">
      {/* Mobile-first Editorial Hero (copy & picture configurable in /admin/settings) */}
      <section className="bg-ink text-white py-8 md:py-16">
        <div className="max-w-site mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Hero product or custom campaign image: shown at top on phones */}
          <div className="md:col-span-5 md:order-2">
            <Link
              href={heroLinkHref}
              className="group block relative aspect-[4/3] sm:aspect-square w-full max-w-md mx-auto bg-neutral-900 border border-neutral-800 overflow-hidden"
            >
                {
                  heroImageSrc?(
                <Image
                  src={heroImageSrc}
              alt={heroImageAlt}
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
                {!hasCustomHeroImage && spotlight && (
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
            {hero.eyebrow && (
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-300 mb-2 block">
                {hero.eyebrow}
              </span>
            )}
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight leading-[1.08] mb-4">
              {hero.headline}
            </h1>
            {hero.description && (
              <p className="text-neutral-200 text-sm sm:text-base md:text-lg font-light leading-relaxed mb-6 max-w-xl mx-auto md:mx-0">
                {hero.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                href="/collections/all"
                className="bg-white text-ink text-xs uppercase tracking-[0.18em] font-semibold px-7 min-h-[48px] inline-flex items-center justify-center hover:bg-neutral-200 transition-colors"
              >
                Shop Collection
              </Link>
              <Link
                href={secondaryCategory ? secondaryCategory.href : '/collections/new-arrivals'}
                className="border border-white text-white text-xs uppercase tracking-[0.18em] font-semibold px-7 min-h-[48px] inline-flex items-center justify-center hover:bg-white hover:text-ink transition-colors"
              >
                {secondaryCategory ? secondaryCategory.title : 'New Arrivals'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Per-Category 3-Piece Rows + 4-Photo Collage More+ Tiles */}
      <div className="max-w-site mx-auto px-4 md:px-6 pt-6 md:pt-10 divide-y divide-line">
        {loadError ? (
          <div className="py-12 border border-line bg-ground text-center p-6 my-4">
            <p className="font-display text-2xl text-ink mb-2">Catalogue temporarily unavailable</p>
            <p className="text-sm text-ink-2">
              Please refresh in a moment to view our sterling silver jewellery.
            </p>
          </div>
        ) : showcases.length === 0 ? (
          <div className="py-12 text-center text-ink-2">
            <p>No active pieces available right now.</p>
          </div>
        ) : (
          showcases.map((showcase) => (
            <ProductGrid
              key={showcase.handle}
              products={showcase.products}
              title={showcase.title}
              subtitle={showcase.subtitle}
              moreTile={{
                href: showcase.href,
                label: showcase.title,
                totalCount: showcase.totalCount,
                collagePhotos: showcase.collagePhotos,
              }}
            />
          ))
        )}
      </div>

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
