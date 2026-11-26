import ProductCard, { ProductCardProps } from './ProductCard';

interface ProductGridProps {
  products: ProductCardProps['product'][];
  title?: string;
  subtitle?: string;
}

export default function ProductGrid({ products, title, subtitle }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center text-ink-2">
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <section className="py-8">
      {(title || subtitle) && (
        <div className="mb-8">
          {subtitle && (
            <span className="block text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 mb-1">
              {subtitle}
            </span>
          )}
          {title && (
            <h2 className="font-display text-3xl md:text-4xl font-normal text-ink">
              {title}
            </h2>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
        {products.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </div>
    </section>
  );
}
