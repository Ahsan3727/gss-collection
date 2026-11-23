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
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const primaryStone = product.stones[0] || 'garnet';
  const hasPhoto = product.photos && product.photos.length > 0 && product.photos[0].startsWith('http');

  return (
    <article className="group flex flex-col">
      <Link
        href={`/products/${product.handle}`}
        className="relative block w-full aspect-square bg-mist overflow-hidden border border-transparent group-hover:border-neutral-300 transition-all"
      >
        {hasPhoto ? (
          <Image
            src={product.photos![0]}
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
          <span className="absolute top-2 left-2 bg-ink text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
            Sale
          </span>
        )}
      </Link>

      <div className="pt-3.5 pb-1 flex flex-col flex-1">
        <h3 className="text-[14px] font-medium text-ink group-hover:underline underline-offset-4 line-clamp-1">
          <Link href={`/products/${product.handle}`}>{product.title}</Link>
        </h3>
        
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-ink">
            {formatMoney(product.base)}
          </span>
          {product.compareAt && product.compareAt > product.base && (
            <span className="text-[12px] text-ink-2 line-through">
              {formatMoney(product.compareAt)}
            </span>
          )}
        </div>

        <p className="text-[11px] uppercase tracking-wider text-ink-2 mt-1">
          925 Sterling Silver
        </p>
      </div>
    </article>
  );
}
