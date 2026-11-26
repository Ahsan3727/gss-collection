import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { Page } from '@/lib/models/Page';
import { Review } from '@/lib/models/Review';
import { STONES } from '@/lib/constants';
import type { PageRecord, ProductRecord, ReviewRecord } from '@/lib/types';

export const COLLECTION_PAGE_SIZE = 12;

export const STATIC_COLLECTION_HANDLES = new Set([
  'all',
  'ladies',
  'gents',
  'gems',
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
      const query: Record<string, unknown> = { status: 'active' };

      if (handle === 'ladies' || handle === 'gents' || handle === 'gems') {
        query.cat = handle;
      } else if (handle === 'sale') {
        query.compareAt = { $exists: true, $ne: null };
      } else if (
        handle !== 'all' &&
        handle !== 'new-arrivals' &&
        handle !== 'best-sellers'
      ) {
        const mappedKey = STONE_HANDLE_TO_KEY[handle] || handle.replace(/-/g, '');
        query.stones = { $in: [handle, mappedKey] };
      }

      if (safeStone) {
        query.stones = safeStone;
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
    { tags: ['products'], revalidate: 300 }
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
