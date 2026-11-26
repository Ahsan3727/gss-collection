import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import ProductGrid from '@/components/store/ProductGrid';
import {
  COLLECTION_PAGE_SIZE,
  getCollectionProducts,
  isValidCollectionHandle,
} from '@/lib/catalogue';
import { STONES } from '@/lib/constants';
import { getSiteUrl } from '@/lib/env';

export const revalidate = 300;

interface CollectionPageProps {
  params: { handle: string };
  searchParams?: { stone?: string; sort?: string; page?: string };
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

function resolveCollectionMeta(handle: string) {
  const lower = handle.toLowerCase();
  if (TITLES[lower]) return TITLES[lower];

  const matchedStone = Object.values(STONES).find(
    (s) => s.handle === lower || s.name.toLowerCase() === lower.replace(/-/g, ' ')
  );
  const stoneByKey = STONES[lower];
  const stone = stoneByKey || matchedStone;

  if (stone) {
    return {
      title: `${stone.name} Collection`,
      subtitle: 'Natural Gemstone',
      desc: `${stone.blurb} Set in handcrafted 925 sterling silver.`,
    };
  }

  const formatted = lower.replace(/-/g, ' ');
  return {
    title: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    subtitle: 'Collection',
    desc: 'Handcrafted in 925 sterling silver with natural untreated gemstones.',
  };
}

function buildCollectionUrl(
  handle: string,
  opts: { stone?: string; sort?: string; page?: number }
): string {
  const params = new URLSearchParams();
  if (opts.stone) params.set('stone', opts.stone);
  if (opts.sort && opts.sort !== 'newest') params.set('sort', opts.sort);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return qs ? `/collections/${handle}?${qs}` : `/collections/${handle}`;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const handle = params.handle.toLowerCase();
  if (!isValidCollectionHandle(handle)) {
    return { title: 'Collection Not Found' };
  }
  const info = resolveCollectionMeta(handle);
  return {
    title: info.title,
    description: info.desc,
    alternates: {
      canonical: `/collections/${handle}`,
    },
    openGraph: {
      title: `${info.title} | GSS Collection`,
      description: info.desc,
      url: `/collections/${handle}`,
    },
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const handle = params.handle.toLowerCase();

  if (!isValidCollectionHandle(handle)) {
    notFound();
  }

  const activeStone = searchParams?.stone?.trim() || '';
  const activeSort = searchParams?.sort || 'newest';
  const currentPage = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  const info = resolveCollectionMeta(handle);
  const { products, total, page, totalPages } = await getCollectionProducts(
    handle,
    activeStone,
    activeSort,
    currentPage,
    COLLECTION_PAGE_SIZE
  );

  const siteUrl = getSiteUrl();
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: info.title,
        item: `${siteUrl}/collections/${handle}`,
      },
    ],
  };

  const stonesFilter = [
    { label: 'All Stones', value: '' },
    { label: 'Garnet', value: 'garnet' },
    { label: 'Turquoise', value: 'turquoise' },
    { label: 'Emerald', value: 'emerald' },
    { label: 'Sapphire', value: 'sapphire' },
    { label: 'Lapis', value: 'lapis' },
  ];

  const startItem = total === 0 ? 0 : (page - 1) * COLLECTION_PAGE_SIZE + 1;
  const endItem = Math.min(total, page * COLLECTION_PAGE_SIZE);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="border-b border-line pb-6 mb-8">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-1.5">
          {info.subtitle}
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink mb-2">
          {info.title}
        </h1>
        <p className="text-sm text-ink-2 max-w-xl leading-relaxed">{info.desc}</p>

        {/* Responsive Filter & Sort Controls */}
        <div className="mt-6 pt-5 border-t border-line/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-ink-2 mr-1">Stone:</span>
            {stonesFilter.map((st) => {
              const isActive = activeStone === st.value;
              const href = buildCollectionUrl(handle, {
                stone: st.value,
                sort: activeSort,
                page: 1,
              });
              return (
                <Link
                  key={st.value || 'all'}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-xs px-3 min-h-[44px] inline-flex items-center transition ${
                    isActive
                      ? 'bg-ink text-white font-semibold'
                      : 'bg-ground text-ink-2 hover:text-ink border border-line'
                  }`}
                >
                  {st.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="uppercase tracking-wider text-ink-2">Sort:</span>
            <Link
              href={buildCollectionUrl(handle, { stone: activeStone, sort: 'newest', page: 1 })}
              className={`px-2.5 min-h-[44px] inline-flex items-center ${
                activeSort === 'newest' ? 'font-semibold text-ink underline' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Newest
            </Link>
            <Link
              href={buildCollectionUrl(handle, { stone: activeStone, sort: 'price-asc', page: 1 })}
              className={`px-2.5 min-h-[44px] inline-flex items-center ${
                activeSort === 'price-asc' ? 'font-semibold text-ink underline' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Price: Low to High
            </Link>
            <Link
              href={buildCollectionUrl(handle, { stone: activeStone, sort: 'price-desc', page: 1 })}
              className={`px-2.5 min-h-[44px] inline-flex items-center ${
                activeSort === 'price-desc' ? 'font-semibold text-ink underline' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Price: High to Low
            </Link>
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="text-xs text-ink-2 mb-2">
            Showing {startItem}–{endItem} of {total} piece{total === 1 ? '' : 's'}
          </div>
          <ProductGrid products={products} />

          {totalPages > 1 && (
            <nav
              aria-label="Collection pagination"
              className="mt-10 pt-6 border-t border-line flex items-center justify-between gap-4"
            >
              {page > 1 ? (
                <Link
                  href={buildCollectionUrl(handle, {
                    stone: activeStone,
                    sort: activeSort,
                    page: page - 1,
                  })}
                  className="border border-line px-5 min-h-[44px] inline-flex items-center text-xs uppercase tracking-wider font-medium text-ink hover:border-ink"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}

              <span className="text-xs text-ink-2">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={buildCollectionUrl(handle, {
                    stone: activeStone,
                    sort: activeSort,
                    page: page + 1,
                  })}
                  className="bg-ink text-white px-5 min-h-[44px] inline-flex items-center text-xs uppercase tracking-wider font-medium hover:bg-neutral-800"
                >
                  Next Page →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="font-display text-2xl text-ink mb-2">No items found</p>
          <p className="text-xs text-ink-2 mb-6">
            There are currently no pieces matching your selected filter criteria.
          </p>
          <Link
            href={`/collections/${handle}`}
            className="inline-flex items-center justify-center min-h-[44px] px-5 border border-ink text-xs uppercase tracking-wider text-ink hover:bg-ground"
          >
            Clear Filters
          </Link>
        </div>
      )}
    </div>
  );
}
