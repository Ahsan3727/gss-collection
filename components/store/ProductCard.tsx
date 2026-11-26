import Link from 'next/link';
import Image from 'next/image';
import RingArt from './RingArt';
import { formatMoney } from '@/lib/money';

export interface ProductCardProps {
  product: {
    handle: string;
    title: string;
    setting: string;
    base: number;
    compareAt?: number;
    stones: string[];
    photos?: string[];
    status?: string;
    cat?: string;
    kind?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const primaryStone = product.stones?.[0] || 'garnet';
  const photoUrl = product.photos?.[0];
  const hasPhoto = Boolean(photoUrl && photoUrl.trim().length > 0);

  let categoryLabel = '925 Sterling Silver';
  if (product.kind === 'stone' || product.cat === 'gems') {
    categoryLabel = 'Natural Gemstone · Untreated';
  } else if (product.kind === 'bracelet') {
    categoryLabel = 'Natural Stone Bracelet';
  }

  return (
    <article className="group flex flex-col">
      <Link
        href={`/products/${product.handle}`}
        className="relative block w-full aspect-square bg-mist overflow-hidden border border-transparent group-hover:border-neutral-300 transition-all"
      >
        {hasPhoto ? (
          <Image
            src={photoUrl!}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="group-hover:scale-105 transition-transform duration-700 ease-out h-full">
            <RingArt setting={product.setting} stone={primaryStone} />
          </div>
        )}

        {product.compareAt && product.compareAt > product.base && (
          <span className="absolute top-2 left-2 bg-ink text-white text-xs font-semibold uppercase tracking-wider px-2 py-0.5">
            Sale
          </span>
        )}
      </Link>

      <div className="pt-3 pb-1 flex flex-col flex-1">
        <h3 className="text-sm font-medium text-ink group-hover:underline underline-offset-4 line-clamp-1">
          <Link href={`/products/${product.handle}`}>{product.title}</Link>
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink">
            {formatMoney(product.base)}
          </span>
          {product.compareAt && product.compareAt > product.base && (
            <span className="text-xs text-ink-2 line-through">
              {formatMoney(product.compareAt)}
            </span>
          )}
        </div>

        <p className="text-xs uppercase tracking-wider text-ink-2 mt-1">
          {categoryLabel}
        </p>
      </div>
    </article>
  );
}
