import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import ProductDetailClient from '@/components/store/ProductDetailClient';
import ProductGrid from '@/components/store/ProductGrid';
import { getApprovedReviews, getProductByHandle, getRelatedProducts } from '@/lib/catalogue';
import { getStoreSettings } from '@/lib/settings';
import { getSiteUrl } from '@/lib/env';
import { totalProductStock } from '@/lib/pricing';

const ProductReviews = dynamic(() => import('@/components/store/ProductReviews'), {
  ssr: false,
});

export const revalidate = 300;

interface ProductPageProps {
  params: { handle: string };
}

function absoluteAssetUrl(siteUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedSite = siteUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedSite}${normalizedPath}`;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductByHandle(params.handle);
  if (!product) {
    return { title: 'Piece Not Found' };
  }
  const siteUrl = getSiteUrl();
  const images = (product.photos || []).map((p) => ({ url: absoluteAssetUrl(siteUrl, p) }));

  return {
    title: product.title,
    description:
      product.desc ||
      `Handcrafted ${product.title} in 925 sterling silver with natural gemstones.`,
    alternates: {
      canonical: `/products/${product.handle}`,
    },
    openGraph: {
      title: `${product.title} | GSS Collection`,
      description: product.desc || undefined,
      url: `/products/${product.handle}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | GSS Collection`,
      description: product.desc || undefined,
      images: images.map((i) => i.url),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProductByHandle(params.handle);

  if (!product) {
    notFound();
  }

  const [related, reviews, settings] = await Promise.all([
    getRelatedProducts(product.cat, product.handle),
    getApprovedReviews(product.id || product.handle),
    getStoreSettings(),
  ]);

  const siteUrl = getSiteUrl();
  const totalStock = totalProductStock(product);
  const availabilityUrl =
    totalStock <= 0
      ? 'https://schema.org/OutOfStock'
      : totalStock <= 3
      ? 'https://schema.org/LimitedAvailability'
      : 'https://schema.org/InStock';

  const variantPrices = (product.variants || [])
    .map((v) => v.price)
    .filter((p) => Number.isFinite(p) && p > 0);
  const lowPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : product.base;
  const highPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : product.base;

  const reviewAvg =
    reviews.length > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : undefined;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: (product.photos || []).map((p) => absoluteAssetUrl(siteUrl, p)),
    description: product.desc,
    sku: product.handle,
    brand: {
      '@type': 'Brand',
      name: settings.storeName || 'GSS Collection',
    },
    offers:
      variantPrices.length > 1 && lowPrice !== highPrice
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'PKR',
            lowPrice,
            highPrice,
            offerCount: product.variants?.length || 1,
            availability: availabilityUrl,
            url: `${siteUrl}/products/${product.handle}`,
          }
        : {
            '@type': 'Offer',
            priceCurrency: 'PKR',
            price: lowPrice,
            availability: availabilityUrl,
            url: `${siteUrl}/products/${product.handle}`,
          },
    ...(reviewAvg
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewAvg,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.cat.charAt(0).toUpperCase() + product.cat.slice(1),
        item: `${siteUrl}/collections/${product.cat}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${siteUrl}/products/${product.handle}`,
      },
    ],
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-14 pb-24 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-ink-2 mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-ink hover:underline py-1">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/collections/${product.cat}`} className="capitalize hover:text-ink hover:underline py-1">
          {product.cat}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink font-medium truncate">{product.title}</span>
      </nav>

      <ProductDetailClient
        product={product}
        whatsappPhone={settings.contact.phone}
        siteUrl={siteUrl}
      />

      <ProductReviews
        productId={product.id || product.handle}
        initialReviews={reviews}
      />

      {related.length > 0 && (
        <div className="mt-20 pt-12 border-t border-line">
          <div className="mb-6">
            <span className="text-xs uppercase tracking-[0.18em] text-ink-2 font-medium block mb-1">
              Complementary Pieces
            </span>
            <h2 className="font-display text-2xl md:text-3xl text-ink font-normal">
              You May Also Admire
            </h2>
          </div>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
