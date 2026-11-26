import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { Page } from '@/lib/models/Page';
import { STATIC_COLLECTION_HANDLES } from '@/lib/catalogue';
import { STONES } from '@/lib/constants';
import { getSiteUrl } from '@/lib/env';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/track-order`, changeFrequency: 'monthly', priority: 0.4 },
    ...Array.from(STATIC_COLLECTION_HANDLES).map((h) => ({
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
    const [products, pages] = await Promise.all([
      Product.find({ status: 'active' }).select('handle updatedAt').lean(),
      Page.find().select('slug updatedAt').lean(),
    ]);

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

    return [...staticEntries, ...productEntries, ...pageEntries];
  } catch (err) {
    console.warn('[Sitemap] Returning static entries only due to DB unavailability:', err);
    return staticEntries;
  }
}
