import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Category } from '@/lib/models/Category';
import { Product } from '@/lib/models/Product';
import type { CategoryRecord } from '@/lib/types';

export const DEFAULT_CATEGORIES: CategoryRecord[] = [
  {
    slug: 'ladies',
    name: 'Ladies Rings',
    subtitle: 'For Her',
    description: 'Delicate halo solitaires, vintage cluster rings, and timeless stacking pieces.',
    defaultKind: 'ring',
    homeKindFilter: 'ring',
    sortOrder: 1,
    showInNav: true,
    showOnHome: true,
    active: true,
  },
  {
    slug: 'gents',
    name: 'Gents Rings',
    subtitle: 'For Him',
    description: 'Heavyweight signet rings, rectangular bezels, and bold handcrafted silver bands.',
    defaultKind: 'ring',
    homeKindFilter: 'ring',
    sortOrder: 2,
    showInNav: true,
    showOnHome: true,
    active: true,
  },
  {
    slug: 'gems',
    name: 'Natural Gems & Bracelets',
    subtitle: 'Untreated Stones',
    description: 'Collector-grade untreated gemstones, natural minerals, and silver stone bracelets.',
    defaultKind: 'stone',
    homeKindFilter: 'all',
    sortOrder: 3,
    showInNav: true,
    showOnHome: true,
    active: true,
  },
];

/**
 * Seeds default store categories atomically once when the collection is completely empty so
 * upgrades and fresh deployments keep existing storefront URLs working immediately.
 */
export async function ensureCategories(): Promise<void> {
  await connectDB();
  const count = await Category.estimatedDocumentCount();
  if (count > 0) return;

  await Promise.all(
    DEFAULT_CATEGORIES.map((doc) =>
      Category.updateOne({ slug: doc.slug }, { $setOnInsert: doc }, { upsert: true })
    )
  );
}

/**
 * Direct DB reader for categories (throws on DB faults so unstable_cache never caches errors).
 */
export async function loadCategories(includeInactive = false): Promise<CategoryRecord[]> {
  await ensureCategories();
  const query = includeInactive ? {} : { active: true };
  const rows = await Category.find(query).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return JSON.parse(JSON.stringify(rows || [])) as CategoryRecord[];
}

const getCachedActiveCategories = unstable_cache(
  async (): Promise<CategoryRecord[]> => loadCategories(false),
  ['store-active-categories'],
  { tags: ['categories'], revalidate: 300 }
);

export async function getActiveCategories(): Promise<CategoryRecord[]> {
  try {
    return await getCachedActiveCategories();
  } catch (err) {
    console.warn('[Categories] Failed to load active categories, using defaults:', err);
    return DEFAULT_CATEGORIES;
  }
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const clean = slug.toLowerCase().trim();
  if (!clean) return null;
  const list = await getActiveCategories();
  return list.find((cat) => cat.slug === clean) ?? null;
}

export async function getCategoriesWithCounts(): Promise<CategoryRecord[]> {
  const [categories, countRows] = await Promise.all([
    loadCategories(true),
    Product.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$cat', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map<string, number>();
  for (const row of countRows) {
    if (row._id) counts.set(String(row._id).toLowerCase(), row.count);
  }

  return categories.map((cat) => ({
    ...cat,
    productCount: counts.get(cat.slug) ?? 0,
  }));
}
