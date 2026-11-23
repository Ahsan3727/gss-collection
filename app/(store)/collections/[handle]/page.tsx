import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import ProductGrid from '@/components/store/ProductGrid';

export const dynamic = 'force-dynamic';

interface CollectionPageProps {
  params: { handle: string };
  searchParams?: { stone?: string; sort?: string };
}

const TITLES: Record<string, { title: string; subtitle: string; desc: string }> = {
  all: {
    title: 'All Jewellery',
    subtitle: 'Full Collection',
    desc: 'Explore our complete range of silver rings, signets, and natural stones.',
  },
  ladies: {
    title: 'Ladies Rings',
    subtitle: 'Rings for Her',
    desc: 'Elegant solitaires, cluster rings, and delicate everyday stacking bands.',
  },
  gents: {
    title: 'Gents Rings',
    subtitle: 'Rings for Him',
    desc: 'Solid silver signets, rectangle stones, and heavyweight traditional bands.',
  },
  gems: {
    title: 'Natural Stones & Gems',
    subtitle: 'Untreated Minerals',
    desc: 'Authentic untreated gemstones set in 925 silver.',
  },
};

export default async function CollectionPage({ params }: CollectionPageProps) {
  const info = TITLES[params.handle] || {
    title: params.handle.replace(/-/g, ' ').toUpperCase(),
    subtitle: 'Collection',
    desc: 'Handmade in 925 sterling silver.',
  };

  let products = [];
  try {
    await connectDB();
    const query: Record<string, any> = { status: 'active' };
    if (params.handle === 'ladies' || params.handle === 'gents' || params.handle === 'gems') {
      query.cat = params.handle;
    }
    products = await Product.find(query).lean();
    products = JSON.parse(JSON.stringify(products));
  } catch (err) {
    console.warn('DB query failed, showing placeholder catalog');
  }

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12">
      {/* Header */}
      <div className="border-b border-line pb-8 mb-10">
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-1">
          {info.subtitle}
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-normal text-ink mb-3">
          {info.title}
        </h1>
        <p className="text-sm text-neutral-600 max-w-xl">
          {info.desc}
        </p>
      </div>

      {/* Grid */}
      <ProductGrid products={products} />
    </div>
  );
}
