import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import ProductGrid from '@/components/store/ProductGrid';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface CollectionPageProps {
  params: { handle: string };
  searchParams?: { stone?: string; sort?: string };
}

const TITLES: Record<string, { title: string; subtitle: string; desc: string }> = {
  all: {
    title: 'All Fine Jewellery',
    subtitle: 'The Complete Catalogue',
    desc: 'Explore handcrafted 925 sterling silver rings, bracelets, and earth-mined gemstones.',
  },
  ladies: {
    title: 'Ladies Rings',
    subtitle: 'Rings for Her',
    desc: 'Delicate halo solitaires, vintage cluster rings, and timeless stacking pieces.',
  },
  gents: {
    title: 'Gents Rings',
    subtitle: 'Rings for Him',
    desc: 'Heavyweight signet rings, rectangular bezels, and bold handcrafted silver bands.',
  },
  gems: {
    title: 'Natural Stones & Rare Gems',
    subtitle: 'Untreated Minerals',
    desc: 'Collector-grade untreated gemstones and authentic natural minerals.',
  },
  'new-arrivals': {
    title: 'New Arrivals',
    subtitle: 'Latest Studio Additions',
    desc: 'Freshly cast and set sterling silver pieces from our master artisan workshop.',
  },
  'best-sellers': {
    title: 'Best Sellers',
    subtitle: 'Customer Favorites',
    desc: 'Our most cherished and requested gemstone rings and silver signets.',
  },
  sale: {
    title: 'Curated Offers',
    subtitle: 'Special Values',
    desc: 'Limited pieces offered with special pricing while atelier stock lasts.',
  },
};

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const handle = params.handle.toLowerCase();
  const activeStone = searchParams?.stone;
  const activeSort = searchParams?.sort || 'newest';

  let info = TITLES[handle];
  if (!info) {
    const formatted = handle.replace(/-/g, ' ');
    info = {
      title: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      subtitle: 'Gemstone Collection',
      desc: `Explore our collection of pieces set with genuine natural ${formatted}.`,
    };
  }

  await connectDB();
  const query: Record<string, any> = { status: 'active' };

  if (handle === 'ladies' || handle === 'gents' || handle === 'gems') {
    query.cat = handle;
  } else if (handle === 'sale') {
    query.compareAt = { $exists: true, $ne: null };
  } else if (handle !== 'all' && handle !== 'new-arrivals' && handle !== 'best-sellers') {
    // Stone collection
    const stoneKey = handle.replace(/-/g, '');
    query.stones = { $in: [handle, stoneKey] };
  }

  if (activeStone) {
    query.stones = activeStone;
  }

  let sortOption: any = { createdAt: -1 };
  if (activeSort === 'price-asc') sortOption = { base: 1 };
  else if (activeSort === 'price-desc') sortOption = { base: -1 };
  else if (activeSort === 'best' || handle === 'best-sellers') sortOption = { sold: -1 };

  const productsRaw = await Product.find(query).sort(sortOption).lean();
  const products = JSON.parse(JSON.stringify(productsRaw || []));

  const stonesFilter = [
    { label: 'All Stones', value: '' },
    { label: 'Garnet', value: 'garnet' },
    { label: 'Turquoise', value: 'turquoise' },
    { label: 'Emerald', value: 'emerald' },
    { label: 'Sapphire', value: 'sapphire' },
    { label: 'Lapis', value: 'lapis' },
  ];

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-16">
      {/* Editorial Header */}
      <div className="border-b border-line pb-8 mb-8">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          {info.subtitle}
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-normal text-ink mb-3">
          {info.title}
        </h1>
        <p className="text-sm text-neutral-600 max-w-xl leading-relaxed">
          {info.desc}
        </p>

        {/* Filter bar */}
        <div className="mt-8 pt-6 border-t border-line/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-3 mr-2">Filter Stone:</span>
            {stonesFilter.map((st) => {
              const isActive = (activeStone || '') === st.value;
              const href = st.value
                ? `/collections/${handle}?stone=${st.value}&sort=${activeSort}`
                : `/collections/${handle}?sort=${activeSort}`;
              return (
                <Link
                  key={st.value}
                  href={href}
                  className={`text-xs px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-ink text-white font-medium'
                      : 'bg-ground text-ink-2 hover:text-ink border border-line'
                  }`}
                >
                  {st.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-3">Sort:</span>
            <div className="flex gap-1 text-xs">
              <Link
                href={`/collections/${handle}?${activeStone ? `stone=${activeStone}&` : ''}sort=newest`}
                className={`px-2.5 py-1 ${activeSort === 'newest' ? 'font-semibold text-ink underline' : 'text-ink-2'}`}
              >
                Newest
              </Link>
              <span className="text-line">|</span>
              <Link
                href={`/collections/${handle}?${activeStone ? `stone=${activeStone}&` : ''}sort=price-asc`}
                className={`px-2.5 py-1 ${activeSort === 'price-asc' ? 'font-semibold text-ink underline' : 'text-ink-2'}`}
              >
                Price: Low to High
              </Link>
              <span className="text-line">|</span>
              <Link
                href={`/collections/${handle}?${activeStone ? `stone=${activeStone}&` : ''}sort=price-desc`}
                className={`px-2.5 py-1 ${activeSort === 'price-desc' ? 'font-semibold text-ink underline' : 'text-ink-2'}`}
              >
                Price: High to Low
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="py-20 text-center max-w-md mx-auto">
          <p className="font-display text-2xl text-ink mb-2">No items found</p>
          <p className="text-xs text-ink-3 mb-6">
            There are currently no pieces matching your selected filter criteria.
          </p>
          <Link
            href={`/collections/${handle}`}
            className="text-xs uppercase tracking-wider underline text-ink hover:text-ink-2"
          >
            Clear Filters
          </Link>
        </div>
      )}
    </div>
  );
}
