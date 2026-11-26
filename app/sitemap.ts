import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { Category } from '@/lib/models/Category';
import { Product } from '@/lib/models/Product';
import { Page } from '@/lib/models/Page';
import { RESERVED_COLLECTION_SLUGS } from '@/lib/category-write';
import { STONES } from '@/lib/constants';
import { getSiteUrl } from '@/lib/env';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/track-order`, changeFrequency: 'monthly', priority: 0.4 },
    ...Array.from(RESERVED_COLLECTION_SLUGS).map((h) => ({
      url: `${siteUrl}/collections/${h}`,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    })),
    ...Object.values(STONES).map((s) => ({
      url: `${siteUrl}/collections/${s.handle}`,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
  ];

  try {
    await connectDB();
    const [categories, products, pages] = await Promise.all([
      Category.find({ active: true }).select('slug updatedAt').lean(),
      Product.find({ status: 'active' }).select('handle updatedAt').lean(),
      Page.find().select('slug updatedAt').lean(),
    ]);

    const categorySource =
      categories.length > 0
        ? categories
        : DEFAULT_CATEGORIES.map((c) => ({ slug: c.slug, updatedAt: undefined }));

    const categoryEntries: MetadataRoute.Sitemap = categorySource.map((c) => ({
      url: `${siteUrl}/collections/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : undefined,
      changeFrequency: 'daily',
      priority: 0.85,
    }));

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${siteUrl}/products/${p.handle}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.9,
    }));

    const pageEntries: MetadataRoute.Sitemap = pages.map((p) => ({
      url: `${siteUrl}/pages/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

    return [...staticEntries, ...categoryEntries, ...productEntries, ...pageEntries];
  } catch (err) {
    console.warn('[Sitemap] Returning static entries only due to DB unavailability:', err);
    const fallbackCategories: MetadataRoute.Sitemap = DEFAULT_CATEGORIES.map((c) => ({
      url: `${siteUrl}/collections/${c.slug}`,
      changeFrequency: 'daily',
      priority: 0.85,
    }));
    return [...staticEntries, ...fallbackCategories];
  }
}
