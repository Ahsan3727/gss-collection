'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import RingArt from './RingArt';
import { STONES } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/lib/cart-context';
import { productStoneDelta, resolveVariantSelection } from '@/lib/pricing';
import { whatsappLink } from '@/lib/contact';
import type { ProductRecord } from '@/lib/types';

const SizeGuideModal = dynamic(() => import('./SizeGuideModal'), {
  ssr: false,
});

export interface ProductDetailClientProps {
  product: ProductRecord;
  whatsappPhone: string;
  siteUrl: string;
}

export default function ProductDetailClient({
  product,
  whatsappPhone,
  siteUrl,
}: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const stonesList = product.stones && product.stones.length > 0 ? product.stones : ['garnet'];
  const sizesList = product.sizes && product.sizes.length > 0 ? product.sizes : ['7'];

  const [selectedStone, setSelectedStone] = useState<string>(stonesList[0]);
  const [selectedSize, setSelectedSize] = useState<string>(sizesList[0]);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [showSizeModal, setShowSizeModal] = useState<boolean>(false);
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const mainCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gss_wishlist');
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        setIsWishlisted(list.includes(product.handle));
      }
    } catch {
      // Ignore storage errors
    }
  }, [product.handle]);

  // Show compact sticky mobile Add-to-Bag bar whenever the main purchase button leaves the screen.
  useEffect(() => {
    const target = mainCtaRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const stoneDef = STONES[selectedStone] || {
    name: selectedStone.charAt(0).toUpperCase() + selectedStone.slice(1),
    handle: selectedStone,
    color: '#8E2A3B',
    mohs: [7, 7] as [number, number],
    delta: 0,
    opaque: false,
    blurb: 'Natural earth-mined gemstone.',
    care: 'Clean with lukewarm soapy water and a soft cloth.',
    words: '',
  };

  // Uses the exact same pricing + stock resolver as POST /api/cart/validate and POST /api/orders.
  const resolved = resolveVariantSelection(product, selectedStone, selectedSize);
  const delta = productStoneDelta(product, selectedStone);

  const isAvailablePrice = resolved.price !== null;
  const currentPrice = resolved.price;
  const currentStock = resolved.stock;
  const isOutOfStock = !isAvailablePrice || currentStock <= 0;

  const isRing = product.kind === 'ring' || (!product.kind && product.cat !== 'gems');
  const photos = product.photos || [];
  const hasPhotos = photos.length > 0;
  const coverPhoto = hasPhotos ? photos[activePhotoIdx] || photos[0] : null;

  const scrollToSlide = (idx: number) => {
    setActivePhotoIdx(idx);
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const handleGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const nextIdx = Math.round(el.scrollLeft / el.clientWidth);
    if (nextIdx !== activePhotoIdx && nextIdx >= 0 && nextIdx < photos.length) {
      setActivePhotoIdx(nextIdx);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock || currentPrice === null) return;
    addItem({
      productId: product.id || product.handle,
      handle: product.handle,
      title: product.title,
      stone: selectedStone,
      size: selectedSize,
      price: currentPrice,
      maxStock: currentStock,
      photo: coverPhoto || undefined,
      qty: 1,
      sku: resolved.sku,
    });
  };

  const handleBuyNow = () => {
    if (isOutOfStock || currentPrice === null) return;
    handleAddToCart();
    router.push('/checkout');
  };

  const toggleWishlist = () => {
    try {
      const raw = localStorage.getItem('gss_wishlist');
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      if (list.includes(product.handle)) {
        list = list.filter((h) => h !== product.handle);
        setIsWishlisted(false);
      } else {
        list.push(product.handle);
        setIsWishlisted(true);
      }
      localStorage.setItem('gss_wishlist', JSON.stringify(list));
    } catch {
      // Ignore storage failures
    }
  };

  const cleanBaseUrl = siteUrl.replace(/\/+$/, '');
  const formattedPriceText = currentPrice !== null ? formatMoney(currentPrice) : 'Price unavailable';
  const sizeText =
    selectedSize === 'adj'
      ? 'Adjustable'
      : selectedSize === 'one'
      ? 'Single piece'
      : `Size ${selectedSize}`;
  const waHref = whatsappLink(
    whatsappPhone,
    `Hello GSS Collection, I would like to order: ${product.title} (${stoneDef.name}, ${sizeText}, ${formattedPriceText}). Link: ${cleanBaseUrl}/products/${product.handle}`
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
        {/* Swipeable Media Gallery */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative bg-mist border border-line overflow-hidden">
            {hasPhotos ? (
              <div
                ref={galleryRef}
                tabIndex={0}
                role="region"
                onScroll={handleGalleryScroll}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && activePhotoIdx < photos.length - 1) {
                    scrollToSlide(activePhotoIdx + 1);
                  } else if (e.key === 'ArrowLeft' && activePhotoIdx > 0) {
                    scrollToSlide(activePhotoIdx - 1);
                  }
                }}
                className="flex w-full snap-x snap-mandatory overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Product gallery"
              >
                {photos.map((photoUrl, idx) => (
                  <div
                    key={`${photoUrl}-${idx}`}
                    className="relative aspect-square w-full shrink-0 snap-center"
                  >
                    <Image
                      src={photoUrl}
                      alt={`${product.title} view ${idx + 1} with ${stoneDef.name}`}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative aspect-square w-full flex items-center justify-center">
                <RingArt setting={product.setting} stone={selectedStone} />
              </div>
            )}

            {/* Wishlist toggle */}
            <button
              type="button"
              onClick={toggleWishlist}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
              className={`absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full backdrop-blur-md transition ${
                isWishlisted
                  ? 'bg-ink text-white'
                  : 'bg-white/90 text-ink hover:bg-white'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={isWishlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>

          {/* Dot indicator + Thumbnail scroll row */}
          {hasPhotos && photos.length > 1 && (
            <>
              <div className="flex justify-center gap-0 sm:hidden" role="group" aria-label="Gallery slides">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToSlide(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    aria-current={activePhotoIdx === idx ? 'true' : undefined}
                    className="min-w-[44px] min-h-[44px] -my-2 inline-flex items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full transition ${
                        activePhotoIdx === idx ? 'bg-ink' : 'bg-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1">
                {photos.map((photo, idx) => (
                  <button
                    key={`${photo}-thumb-${idx}`}
                    type="button"
                    onClick={() => scrollToSlide(idx)}
                    aria-label={`Select photo ${idx + 1}`}
                    className={`relative w-20 h-20 shrink-0 bg-ground border overflow-hidden transition ${
                      activePhotoIdx === idx
                        ? 'border-ink ring-1 ring-ink'
                        : 'border-line hover:border-neutral-400'
                    }`}
                  >
                    <Image
                      src={photo}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Details & Selection Panel */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs uppercase tracking-[0.18em] text-ink-2 font-medium mb-1.5">
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
          <div className="flex flex-wrap items-baseline gap-3 mb-5">
            <span className="text-2xl md:text-3xl font-semibold text-ink">
              {currentPrice !== null ? formatMoney(currentPrice) : 'Unavailable'}
            </span>
            {currentPrice !== null && resolved.compareAt && resolved.compareAt > currentPrice && (
              <span className="text-base text-ink-2 line-through">
                {formatMoney(resolved.compareAt)}
              </span>
            )}
            <span
              className={`text-xs px-2.5 py-1 rounded-sm font-semibold ${
                !isAvailablePrice
                  ? 'bg-neutral-200 text-ink'
                  : currentStock <= 0
                  ? 'bg-red-50 text-error'
                  : currentStock <= 3
                  ? 'bg-amber-50 text-gold'
                  : 'bg-emerald-50 text-ok'
              }`}
            >
              {!isAvailablePrice
                ? 'Unavailable'
                : currentStock <= 0
                ? 'Sold Out'
                : currentStock <= 3
                ? `Only ${currentStock} left`
                : 'In Stock'}
            </span>
          </div>

          <p className="text-sm sm:text-base text-ink-2 leading-relaxed mb-6">
            {product.desc ||
              'Handcrafted by master silversmiths using high-purity 925 sterling silver and authentic mined gemstones.'}
          </p>

          <div className="border-t border-b border-line py-5 space-y-6">
            {/* Gemstone Selector */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-ink">
                  Gemstone: <span className="font-normal text-ink-2">{stoneDef.name}</span>
                </span>
                {delta > 0 && (
                  <span className="text-xs text-ink-2 font-medium">+{formatMoney(delta)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {stonesList.map((st) => {
                  const def = STONES[st] || {
                    name: st.charAt(0).toUpperCase() + st.slice(1),
                    color: '#8E2A3B',
                  };
                  const stDelta = productStoneDelta(product, st);
                  const isSelected = selectedStone === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedStone(st)}
                      className={`flex items-center gap-2 px-3.5 min-h-[44px] text-xs border transition ${
                        isSelected
                          ? 'border-ink bg-ground text-ink font-semibold ring-1 ring-ink'
                          : 'border-line hover:border-neutral-400 text-ink-2'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0"
                        style={{ backgroundColor: def.color }}
                        aria-hidden="true"
                      />
                      <span>{def.name}</span>
                      {stDelta > 0 && <span className="text-xs text-ink-2">+{stDelta}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-2 mt-2.5">{stoneDef.blurb}</p>
            </div>

            {/* Size / Specimen Specs */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs uppercase tracking-wider font-semibold text-ink">
                  {isRing ? 'Select US Ring Size' : 'Fit & Details'}
                </span>
                {isRing && (
                  <button
                    type="button"
                    onClick={() => setShowSizeModal(true)}
                    className="text-xs text-ink-2 underline hover:text-ink min-h-[44px] px-2 -mr-2 inline-flex items-center"
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
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedSize(sz)}
                        className={`min-w-[44px] min-h-[44px] px-2 text-sm font-medium border flex items-center justify-center transition ${
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
                <div className="text-xs bg-ground border border-line p-3.5 text-ink-2 space-y-1">
                  {product.kind === 'stone' || product.cat === 'gems' ? (
                    <>
                      <p>Type: Untreated natural mineral specimen (single piece)</p>
                      <p>Mohs hardness: {stoneDef.mohs.join(' – ')}</p>
                      {product.weight ? <p>Weight: {product.weight} g</p> : null}
                    </>
                  ) : (
                    <p>Adjustable durable cord designed to fit wrists comfortably (16 cm – 20 cm).</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div ref={mainCtaRef} className="mt-7 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 bg-ink text-white min-h-[48px] px-6 text-xs uppercase tracking-[0.2em] font-semibold hover:bg-neutral-800 transition disabled:opacity-40"
              >
                {!isAvailablePrice ? 'Unavailable' : isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 border border-ink text-ink min-h-[48px] px-6 text-xs uppercase tracking-[0.2em] font-semibold hover:bg-ground transition disabled:opacity-40"
              >
                Buy Now
              </button>
            </div>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-ok text-ok bg-emerald-50/40 min-h-[48px] text-xs uppercase tracking-[0.16em] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
              >
                Order via WhatsApp Direct
              </a>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-8 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-2">
            <div className="flex items-start gap-2.5">
              <span className="text-ink font-bold" aria-hidden="true">✓</span>
              <div>
                <span className="font-semibold text-ink block">
                  {product.kind === 'stone' || product.cat === 'gems'
                    ? 'Authentic Untreated Stone'
                    : 'Guaranteed 925 Silver'}
                </span>
                <span>
                  {product.kind === 'stone' || product.cat === 'gems'
                    ? 'Sourced directly and verified untreated'
                    : 'Pure hallmarked precious sterling metal'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-ink font-bold" aria-hidden="true">✓</span>
              <div>
                <span className="font-semibold text-ink block">Insured Nationwide Delivery</span>
                <span>Tracked courier dispatch across Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Add-to-Bag Bar */}
      {showStickyBar && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-semibold text-sm text-ink block truncate">
              {currentPrice !== null ? formatMoney(currentPrice) : 'Unavailable'}
            </span>
            <span className="text-xs text-ink-2 capitalize block truncate">
              {stoneDef.name} · {sizeText}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="bg-ink text-white px-5 min-h-[44px] text-xs uppercase tracking-[0.16em] font-semibold shrink-0 hover:bg-neutral-800 disabled:opacity-40"
          >
            {!isAvailablePrice ? 'Unavailable' : isOutOfStock ? 'Sold Out' : 'Add to Bag'}
          </button>
        </div>
      )}

      <SizeGuideModal open={showSizeModal} onOpenChange={setShowSizeModal} />
    </>
  );
}
