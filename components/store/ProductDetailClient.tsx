'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import RingArt from './RingArt';
import { STONES } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/lib/cart-context';

export interface ProductDetailProps {
  product: {
    id: string;
    handle: string;
    title: string;
    setting: string;
    cat: string;
    kind: string;
    base: number;
    compareAt?: number;
    stones: string[];
    sizes: string[];
    photos: string[];
    desc: string;
    weight?: number;
    width?: number;
    variants?: any[];
    inventory?: Record<string, number>;
  };
}

export default function ProductDetailClient({ product }: ProductDetailProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const stonesList = product.stones && product.stones.length > 0 ? product.stones : ['garnet'];
  const sizesList = product.sizes && product.sizes.length > 0 ? product.sizes : ['7'];

  const [selectedStone, setSelectedStone] = useState<string>(stonesList[0]);
  const [selectedSize, setSelectedSize] = useState<string>(sizesList[0]);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [showSizeModal, setShowSizeModal] = useState<boolean>(false);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('gss_wishlist');
        const list = raw ? JSON.parse(raw) : [];
        return list.includes(product.handle);
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const stoneDef = STONES[selectedStone] || STONES.garnet || {
    name: selectedStone,
    color: '#8E2A3B',
    delta: 0,
    blurb: 'Natural earth-mined gemstone.',
    care: 'Clean with lukewarm soapy water and a soft cloth.',
  };

  const delta = stoneDef.delta || 0;
  const currentPrice = (product.base || 9000) + delta;

  // Determine stock from variants or inventory
  let currentStock = 10;
  if (product.variants && product.variants.length > 0) {
    const v = product.variants.find(
      (item: any) => item.stone === selectedStone && item.size === selectedSize
    );
    if (v) currentStock = v.stock;
  } else if (product.inventory) {
    const key = `${selectedStone}:${selectedSize}`;
    if (key in product.inventory) {
      currentStock = product.inventory[key];
    }
  }

  const isOutOfStock = currentStock <= 0;
  const isRing = product.kind === 'ring' || (!product.kind && product.cat !== 'gems');
  const hasPhotos = product.photos && product.photos.length > 0;
  const currentPhoto = hasPhotos ? product.photos[activePhotoIdx] || product.photos[0] : null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const sku = `${product.handle.toUpperCase()}-${selectedStone.toUpperCase()}-${selectedSize}`;
    addItem({
      productId: product.id || product.handle,
      handle: product.handle,
      title: product.title,
      stone: selectedStone,
      size: selectedSize,
      price: currentPrice,
      photo: currentPhoto || undefined,
      qty: 1,
      sku,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const toggleWishlist = () => {
    try {
      const raw = localStorage.getItem('gss_wishlist');
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (list.includes(product.handle)) {
        list = list.filter((h) => h !== product.handle);
        setIsWishlisted(false);
      } else {
        list.push(product.handle);
        setIsWishlisted(true);
      }
      localStorage.setItem('gss_wishlist', JSON.stringify(list));
    } catch (e) {}
  };

  const whatsappMessage = encodeURIComponent(
    `Hello GSS Collection, I would like to order: ${product.title} in ${stoneDef.name}, Size ${selectedSize} (Price: Rs. ${currentPrice.toLocaleString()}). Link: https://gsscollection.com/products/${product.handle}`
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
      {/* Media & Visual Section */}
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square w-full bg-mist border border-line overflow-hidden">
          {currentPhoto ? (
            <Image
              src={currentPhoto}
              alt={`${product.title} - ${stoneDef.name}`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <RingArt setting={product.setting} stone={selectedStone} />
            </div>
          )}

          {/* Wishlist floating toggle */}
          <button
            onClick={toggleWishlist}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition ${
              isWishlisted
                ? 'bg-ink text-white'
                : 'bg-white/80 text-ink hover:bg-white'
            }`}
            aria-label="Save to Wishlist"
          >
            <svg className="w-5 h-5" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Thumbnail Bar */}
        {hasPhotos && product.photos.length > 1 && (
          <div className="flex gap-3">
            {product.photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`relative w-20 h-20 bg-ground border overflow-hidden transition ${
                  activePhotoIdx === idx ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-neutral-400'
                }`}
              >
                <Image src={photo} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details & Selection Panel */}
      <div className="flex flex-col">
        {/* Category Badge */}
        <span className="text-[11px] uppercase tracking-[0.22em] text-ink-2 font-medium mb-1.5">
          {product.kind === 'stone' || product.cat === 'gems'
            ? 'Natural Untreated Mineral Specimen'
            : product.kind === 'bracelet'
            ? 'Natural Stone Bead Bracelet'
            : 'Handcrafted 925 Sterling Silver Ring'}
        </span>

        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink mb-4 leading-tight">
          {product.title}
        </h1>

        {/* Pricing & Stock Status */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-2xl md:text-3xl font-semibold text-ink">
            {formatMoney(currentPrice)}
          </span>
          {product.compareAt && product.compareAt > currentPrice && (
            <span className="text-base text-ink-2 line-through">
              {formatMoney(product.compareAt)}
            </span>
          )}
          <span className={`text-xs ml-3 px-2 py-0.5 rounded-sm font-medium ${
            isOutOfStock
              ? 'bg-red-50 text-red-700'
              : currentStock <= 3
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-800'
          }`}>
            {isOutOfStock ? 'Sold Out' : currentStock <= 3 ? `Only ${currentStock} left` : 'In Stock'}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-600 leading-relaxed mb-6 font-light">
          {product.desc || 'Handcrafted by master silversmiths using high-purity 925 sterling silver and authentic mined gemstones.'}
        </p>

        <div className="border-t border-b border-line py-5 space-y-6">
          {/* Gemstone Selector */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-ink">
                Gemstone: <span className="font-normal text-neutral-600">{stoneDef.name}</span>
              </label>
              {delta > 0 && (
                <span className="text-[11px] text-ink-2 font-medium">+{formatMoney(delta)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {stonesList.map((st) => {
                const def = STONES[st] || { name: st, color: '#8E2A3B', delta: 0 };
                const isSelected = selectedStone === st;
                return (
                  <button
                    key={st}
                    onClick={() => setSelectedStone(st)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs border transition ${
                      isSelected
                        ? 'border-ink bg-ground text-ink font-semibold ring-1 ring-ink'
                        : 'border-line hover:border-neutral-400 text-ink-2'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: def.color }}
                    />
                    <span>{def.name}</span>
                    {def.delta > 0 && <span className="text-[10px] text-ink-3">+{def.delta}</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-3 mt-2 font-light">{stoneDef.blurb}</p>
          </div>

          {/* Size Selector */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-ink">
                {isRing ? 'Select US Ring Size' : 'Fit & Sizing'}
              </label>
              {isRing && (
                <button
                  onClick={() => setShowSizeModal(true)}
                  className="text-[11px] text-ink-2 underline hover:text-ink cursor-pointer"
                >
                  Size Guide
                </button>
              )}
            </div>

            {isRing ? (
              <div className="flex flex-wrap gap-2">
                {sizesList.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`w-11 h-11 text-xs font-medium border flex items-center justify-center transition ${
                        isSelected
                          ? 'border-ink bg-ink text-white'
                          : 'border-line hover:border-neutral-400 text-ink bg-white'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs bg-ground border border-line p-3 text-ink-2">
                {product.kind === 'stone'
                  ? 'Natural single mineral piece as photographed. Weight: ' + (product.weight ? `${product.weight}g` : 'Authentic')
                  : 'Adjustable durable elastic cord designed to fit wrists comfortably (16cm - 20cm).'}
              </div>
            )}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-8 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 bg-ink text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition disabled:opacity-40"
            >
              {isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 border border-ink text-ink py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-ground transition disabled:opacity-40"
            >
              Buy Now
            </button>
          </div>

          {/* WhatsApp Direct Order */}
          <a
            href={`https://wa.me/923001234567?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full border border-emerald-600 text-emerald-800 bg-emerald-50/50 py-3 text-xs uppercase tracking-[0.16em] font-medium flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
          >
            <span>Order via WhatsApp Direct</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 pt-6 border-t border-line grid grid-cols-2 gap-4 text-xs text-ink-2">
          <div className="flex items-start gap-2.5">
            <span className="text-ink font-bold">✓</span>
            <div>
              <span className="font-semibold text-ink block">Guaranteed 925 Silver</span>
              <span className="text-[11px] text-ink-3">Pure hallmarked precious sterling metal</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-ink font-bold">✓</span>
            <div>
              <span className="font-semibold text-ink block">Free Delivery over 15k</span>
              <span className="text-[11px] text-ink-3">Nationwide insured delivery via TCS/Trax</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sizing Modal */}
      {showSizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white max-w-lg w-full p-6 md:p-8 border border-line shadow-2xl relative">
            <button
              onClick={() => setShowSizeModal(false)}
              className="absolute top-4 right-4 text-ink-2 hover:text-ink text-lg"
            >
              ✕
            </button>
            <span className="text-[11px] uppercase tracking-[0.2em] text-ink-2 block mb-1 font-semibold">
              GSS Ring Sizing
            </span>
            <h2 className="font-display text-2xl text-ink font-normal mb-4">
              Ring Size Chart (US Standard)
            </h2>
            <div className="overflow-x-auto text-xs text-left mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line bg-ground text-ink uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">US Size</th>
                    <th className="py-2.5 px-3">Inside Diameter (mm)</th>
                    <th className="py-2.5 px-3">Circumference (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr><td className="py-2 px-3 font-semibold text-ink">5</td><td className="py-2 px-3">15.7 mm</td><td className="py-2 px-3">49.3 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">6</td><td className="py-2 px-3">16.5 mm</td><td className="py-2 px-3">51.8 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">7</td><td className="py-2 px-3">17.3 mm</td><td className="py-2 px-3">54.4 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">8</td><td className="py-2 px-3">18.1 mm</td><td className="py-2 px-3">56.9 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">9</td><td className="py-2 px-3">18.9 mm</td><td className="py-2 px-3">59.5 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">10</td><td className="py-2 px-3">19.8 mm</td><td className="py-2 px-3">62.1 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">11</td><td className="py-2 px-3">20.6 mm</td><td className="py-2 px-3">64.6 mm</td></tr>
                  <tr><td className="py-2 px-3 font-semibold text-ink">12</td><td className="py-2 px-3">21.4 mm</td><td className="py-2 px-3">67.2 mm</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-3 leading-relaxed mb-6">
              Tip: If you fall between sizes, we recommend selecting the larger size for wider bands.
            </p>
            <button
              onClick={() => setShowSizeModal(false)}
              className="w-full bg-ink text-white py-3 text-xs uppercase tracking-[0.2em] font-medium"
            >
              Close Size Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
