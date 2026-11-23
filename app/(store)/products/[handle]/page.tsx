import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models/Product';
import { STONES } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import RingArt from '@/components/store/RingArt';

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: { handle: string };
}

async function getProduct(handle: string) {
  try {
    await connectDB();
    const p = await Product.findOne({ handle, status: 'active' }).lean();
    if (p) return JSON.parse(JSON.stringify(p));
  } catch (err) {
    console.warn('DB read failed:', err);
  }

  // Fallback demo product
  if (handle === 'crimson-halo-ring') {
    return {
      handle: 'crimson-halo-ring',
      title: 'Crimson Halo Ring',
      setting: 'cluster',
      base: 9800,
      compareAt: 11500,
      stones: ['garnet'],
      sizes: ['5', '6', '7', '8', '9'],
      desc: 'An oval, deep red garnet stone held in four claws and framed by a halo of small white stones. A slim silver band keeps it light on the hand.',
      weight: 4.6,
      width: 3,
    };
  }

  return null;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProduct(params.handle);

  if (!product) {
    notFound();
  }

  const primaryStone = product.stones[0] || 'garnet';
  const stoneData = STONES[primaryStone] || STONES.garnet;

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Gallery / Visual Display */}
        <div className="border border-line bg-mist">
          <RingArt setting={product.setting} stone={primaryStone} />
        </div>

        {/* Product Details & Purchase Controls */}
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-2 font-medium mb-1">
            GSS Collection · 925 Sterling Silver
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-normal text-ink mb-3">
            {product.title}
          </h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-semibold text-ink">
              {formatMoney(product.base)}
            </span>
            {product.compareAt && product.compareAt > product.base && (
              <span className="text-base text-ink-2 line-through">
                {formatMoney(product.compareAt)}
              </span>
            )}
          </div>

          <div className="border-t border-b border-line py-5 my-2 space-y-4">
            {/* Stone information */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                Gemstone: <span className="font-normal text-ink-2">{stoneData.name}</span>
              </label>
              <p className="text-xs text-ink-2 leading-relaxed">
                {stoneData.blurb}
              </p>
            </div>

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs uppercase tracking-wider font-semibold text-ink">
                    Select Ring Size (US)
                  </label>
                  <span className="text-[11px] text-ink-2 underline cursor-pointer">
                    Size guide
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz: string) => (
                    <button
                      key={sz}
                      className="min-w-10 h-10 px-3 border border-neutral-300 text-xs font-medium text-ink hover:border-ink focus:border-ink focus:bg-ink focus:text-white transition-all"
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <button className="w-full bg-ink text-white py-4 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-neutral-800 transition-colors">
              Add to Bag
            </button>
            <a
              href={`https://wa.me/923000000000?text=Hi%2C%20I%20am%20interested%20in%20${encodeURIComponent(product.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-ink text-ink text-center py-3.5 text-xs font-medium uppercase tracking-[0.18em] hover:bg-ground transition-colors"
            >
              Inquire via WhatsApp
            </a>
          </div>

          {/* Details & Specs */}
          <div className="mt-10 border-t border-line divide-y divide-line text-sm">
            <div className="py-4">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-ink mb-1">
                Description
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {product.desc || 'Handcrafted 925 solid sterling silver with genuine natural gemstone.'}
              </p>
            </div>

            <div className="py-4">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-ink mb-1">
                Stone Care & Hardness
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Mohs Hardness: {stoneData.mohs.join(' to ')}. {stoneData.care}
              </p>
            </div>

            <div className="py-4">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-ink mb-1">
                Shipping & Returns
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Standard delivery 3 to 5 business days across Pakistan. Free delivery on orders over Rs. 15,000. Inspect parcel upon delivery with Cash on Delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
