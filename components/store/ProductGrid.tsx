import Link from 'next/link';
import Image from 'next/image';
import ProductCard, { ProductCardProps } from './ProductCard';

export interface ProductGridMoreTile {
  href: string;
  label: string;
  totalCount: number;
  collagePhotos: string[];
}

interface ProductGridProps {
  products: ProductCardProps['product'][];
  title?: string;
  subtitle?: string;
  moreTile?: ProductGridMoreTile;
}

export default function ProductGrid({ products, title, subtitle, moreTile }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center text-ink-2">
        <p>No products found.</p>
      </div>
    );
  }

  const gridColsClass = moreTile
    ? 'grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10'
    : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12';

  return (
    <section className="py-8">
      {(title || subtitle) && (
        <div className="mb-6 md:mb-8 flex items-end justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            {subtitle && (
              <span className="block text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 mb-1">
                {subtitle}
              </span>
            )}
            {title && (
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-normal text-ink">
                {title}
              </h2>
            )}
          </div>
          {moreTile && (
            <Link
              href={moreTile.href}
              className="shrink-0 min-h-[44px] inline-flex items-center text-xs uppercase tracking-[0.16em] font-semibold text-ink hover:underline underline-offset-4"
            >
              View All ({moreTile.totalCount}) →
            </Link>
          )}
        </div>
      )}

      <div className={gridColsClass}>
        {products.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}

        {moreTile && (
          <article className="group flex flex-col min-w-0">
            <Link
              href={moreTile.href}
              aria-label={`More+: browse all ${moreTile.totalCount} ${moreTile.label}`}
              className="flex flex-col flex-1 min-w-0"
            >
              <div className="relative block w-full aspect-square bg-ink overflow-hidden border border-line group-hover:border-ink transition-all">
                {moreTile.collagePhotos.length > 0 && (
                  <div
                    aria-hidden="true"
                    className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5 bg-neutral-900"
                  >
                    {moreTile.collagePhotos.slice(0, 4).map((photoUrl, idx) => (
                      <div key={`${photoUrl}-${idx}`} className="relative w-full h-full overflow-hidden">
                        <Image
                          src={photoUrl}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 25vw, 12vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 bg-ink/70 group-hover:bg-ink/80 transition-colors flex flex-col items-center justify-center p-3 text-center text-white">
                  <span className="font-display text-2xl sm:text-3xl font-normal tracking-wide leading-none">
                    More +
                  </span>
                  <span className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-100 font-semibold">
                    {moreTile.totalCount > products.length
                      ? `+${moreTile.totalCount - products.length} More`
                      : `View All ${moreTile.totalCount}`}
                  </span>
                </div>
              </div>

              <div className="pt-3 pb-1 flex flex-col flex-1">
                <span className="text-sm font-medium text-ink group-hover:underline underline-offset-4 line-clamp-1">
                  All {moreTile.label} →
                </span>
                <span className="text-xs uppercase tracking-wider text-ink-2 mt-1">
                  {moreTile.totalCount} {moreTile.totalCount === 1 ? 'piece' : 'pieces'} in collection
                </span>
              </div>
            </Link>
          </article>
        )}
      </div>
    </section>
  );
}
