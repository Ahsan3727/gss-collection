import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import { ensureCategories, getActiveCategories, loadCategories } from '@/lib/categories';
import { Product } from '@/lib/models/Product';
import { Page } from '@/lib/models/Page';
import { Review } from '@/lib/models/Review';
import { STONES } from '@/lib/constants';
import {
  DEFAULT_CATEGORY_SLUGS,
  type HomeCategoryShowcase,
  type PageRecord,
  type ProductRecord,
  type ReviewRecord,
} from '@/lib/types';

export const COLLECTION_PAGE_SIZE = 12;
export const HOME_CATEGORY_VISIBLE_LIMIT = 3;

export const STATIC_COLLECTION_HANDLES = new Set([
  'all',
  ...DEFAULT_CATEGORY_SLUGS,
  'new-arrivals',
  'best-sellers',
  'sale',
]);

export function isValidCollectionHandle(handle: string): boolean {
  const lower = handle.toLowerCase();
  if (STATIC_COLLECTION_HANDLES.has(lower)) return true;
  if (Object.prototype.hasOwnProperty.call(STONES, lower)) return true;
  return Object.values(STONES).some((s) => s.handle === lower);
}

const STONE_HANDLE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(STONES).flatMap(([key, def]) => [
    [key, key],
    [def.handle, key],
  ])
);

const getCachedHomeFeatured = unstable_cache(
  async (): Promise<ProductRecord[]> => {
    await connectDB();
    const products = await Product.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    return JSON.parse(JSON.stringify(products || [])) as ProductRecord[];
  },
  ['home-featured-products'],
  { tags: ['products'], revalidate: 300 }
);

export async function getHomeFeaturedProducts(): Promise<ProductRecord[]> {
  return getCachedHomeFeatured();
}

/**
 * Picks 4 product photo URLs for a category's More+ collage background.
 * Prioritizes additional unseen items in the same category (#4..#7), then visible category
 * items (#1..#3), then active store fallback photos so all 4 collage cells stay populated.
 */
export function selectMoreCollagePhotos(
  categoryItems: Pick<ProductRecord, 'photos'>[],
  fallbackPhotos: string[] = []
): string[] {
  const picked: string[] = [];
  const pushUnique = (url?: string) => {
    const clean = url?.trim();
    if (clean && !picked.includes(clean)) {
      picked.push(clean);
    }
  };

  for (const item of categoryItems.slice(HOME_CATEGORY_VISIBLE_LIMIT)) {
    pushUnique(item.photos?.[0]);
    if (picked.length >= 4) return picked.slice(0, 4);
  }
  for (const item of categoryItems) {
    for (const url of item.photos || []) {
      pushUnique(url);
      if (picked.length >= 4) return picked.slice(0, 4);
    }
  }
  for (const url of fallbackPhotos) {
    pushUnique(url);
    if (picked.length >= 4) return picked.slice(0, 4);
  }

  // If the entire database has 1..3 photos total, cycle them so the 2x2 mosaic still renders cleanly.
  if (picked.length > 0) {
    const base = [...picked];
    while (picked.length < 4) {
      picked.push(base[picked.length % base.length]);
    }
  }
  return picked.slice(0, 4);
}

function matchesHomeKindFilter(
  product: Pick<ProductRecord, 'kind'>,
  filter: 'all' | 'ring' | 'bracelet' | 'stone'
): boolean {
  if (filter === 'all') return true;
  if (filter === 'ring') return !product.kind || product.kind === 'ring';
  return product.kind === filter;
}

const getCachedHomeCategoryShowcases = unstable_cache(
  async (): Promise<HomeCategoryShowcase[]> => {
    await connectDB();
    const activeCategories = (await loadCategories(false)).filter(
      (c) => c.targetType !== 'page' && c.showOnHome
    );
    if (activeCategories.length === 0) return [];

    const slugs = activeCategories.map((c) => c.slug);
    const [grouped, photoPool] = await Promise.all([
      Product.aggregate<{ _id: string; items: ProductRecord[] }>([
        { $match: { status: 'active', cat: { $in: slugs } } },
        { $sort: { sortOrder: 1, sold: -1, createdAt: -1 } },
        { $group: { _id: '$cat', items: { $push: '$$ROOT' } } },
      ]),
      Product.find({ status: 'active', 'photos.0': { $exists: true } })
        .sort({ sortOrder: 1, sold: -1, createdAt: -1 })
        .limit(12)
        .select({ _id: 0, photos: 1 })
        .lean(),
    ]);

    const fallbackPhotos = (photoPool || [])
      .map((p) => p.photos?.[0])
      .filter((url): url is string => Boolean(url && url.trim()));

    const itemsByCat = new Map<string, ProductRecord[]>();
    for (const row of grouped) {
      if (row._id) itemsByCat.set(String(row._id).toLowerCase(), row.items || []);
    }

    const showcases: HomeCategoryShowcase[] = [];
    for (const cfg of activeCategories) {
      const catItems = itemsByCat.get(cfg.slug) || [];
      const filtered = catItems.filter((p) => matchesHomeKindFilter(p, cfg.homeKindFilter));
      if (filtered.length === 0) continue;

      const serialized = JSON.parse(JSON.stringify(filtered.slice(0, 7))) as ProductRecord[];
      showcases.push({
        handle: cfg.slug,
        title: cfg.name,
        subtitle: cfg.subtitle,
        href: `/collections/${cfg.slug}`,
        totalCount: filtered.length,
        products: serialized.slice(0, HOME_CATEGORY_VISIBLE_LIMIT),
        collagePhotos: selectMoreCollagePhotos(serialized, fallbackPhotos),
      });
    }

    return showcases;
  },
  ['home-category-showcases'],
  { tags: ['products', 'categories'], revalidate: 300 }
);

export async function getHomeCategoryShowcases(): Promise<HomeCategoryShowcase[]> {
  return getCachedHomeCategoryShowcases();
}

export interface CollectionQueryResult {
  products: ProductRecord[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getCollectionProducts(
  rawHandle: string,
  stone?: string,
  sort = 'newest',
  page = 1,
  limit = COLLECTION_PAGE_SIZE
): Promise<CollectionQueryResult> {
  const handle = rawHandle.toLowerCase();
  const safeStone = (stone || '').toLowerCase().trim();
  const safeSort = sort || 'newest';
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(48, Math.max(1, limit));

  return unstable_cache(
    async (): Promise<CollectionQueryResult> => {
      await connectDB();
      await ensureCategories();
      const activeCats = await getActiveCategories();
      const query: Record<string, unknown> = { status: 'active' };

      if (handle === 'sale') {
        query.compareAt = { $exists: true, $ne: null };
      } else if (handle !== 'all' && handle !== 'new-arrivals' && handle !== 'best-sellers') {
          if (activeCats.some((c) => c.slug === handle && c.targetType !== 'page')) {
            query.cat = handle;
          } else {
            const mappedKey = STONE_HANDLE_TO_KEY[handle] || handle.replace(/-/g, '');
            query.stones = { $in: [handle, mappedKey] };
          }
        }

        if (safeStone) {
          if (query.stones) {
            query.$and = [{ stones: query.stones }, { stones: safeStone }];
            delete query.stones;
          } else {
            query.stones = safeStone;
          }
        }

        let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
        if (safeSort === 'price-asc') sortOption = { base: 1 };
        else if (safeSort === 'price-desc') sortOption = { base: -1 };
        else if (safeSort === 'best' || handle === 'best-sellers') sortOption = { sold: -1 };

        const [total, rawProducts] = await Promise.all([
          Product.countDocuments(query),
          Product.find(query)
            .sort(sortOption)
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit)
            .lean(),
        ]);

        return {
          products: JSON.parse(JSON.stringify(rawProducts || [])) as ProductRecord[],
          total,
          page: safePage,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        };
      },
      ['collection-products', handle, safeStone, safeSort, String(safePage), String(safeLimit)],
        { tags: ['products', 'categories'], revalidate: 300 }
  )();
}

export async function getProductByHandle(handle: string): Promise<ProductRecord | null> {
  try {
    return await unstable_cache(
      async () => {
        await connectDB();
        const doc = await Product.findOne({ handle, status: 'active' }).lean();
        return doc ? (JSON.parse(JSON.stringify(doc)) as ProductRecord) : null;
      },
      ['product', handle],
      { tags: ['products', `product:${handle}`], revalidate: 300 }
    )();
  } catch (err) {
    console.error('[Product Detail] DB read failed:', err);
    return null;
  }
}

export async function getRelatedProducts(
  cat: string,
  currentHandle: string
): Promise<ProductRecord[]> {
  try {
    return await unstable_cache(
      async () => {
        await connectDB();
        const related = await Product.find({
          cat,
          handle: { $ne: currentHandle },
          status: 'active',
        })
          .limit(4)
          .lean();
        return JSON.parse(JSON.stringify(related || [])) as ProductRecord[];
      },
      ['related-products', cat, currentHandle],
      { tags: ['products'], revalidate: 300 }
    )();
  } catch (err) {
    console.error('[Related Products] DB read failed:', err);
    return [];
  }
}

export async function getApprovedReviews(productId: string): Promise<ReviewRecord[]> {
  try {
    return await unstable_cache(
      async () => {
        await connectDB();
        const list = await Review.find({ productId, approved: true })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
        return JSON.parse(JSON.stringify(list || [])) as ReviewRecord[];
      },
      ['product-reviews', productId],
      { tags: [`reviews:${productId}`], revalidate: 300 }
    )();
  } catch (err) {
    console.error('[Product Reviews] DB read failed:', err);
    return [];
  }
}

export async function getStaticPageBySlug(slug: string): Promise<PageRecord | null> {
  try {
    return await unstable_cache(
      async () => {
        await connectDB();
        const doc = await Page.findOne({ slug }).lean();
        return doc ? (JSON.parse(JSON.stringify(doc)) as PageRecord) : null;
      },
      ['page', slug],
      { tags: ['pages', `page:${slug}`], revalidate: 3600 }
    )();
  } catch (err) {
    console.error(`[Page] Failed to fetch page ${slug}:`, err);
    return null;
  }
}
