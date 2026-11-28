'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { DEFAULT_RING_SIZES, type PageImage, type RingSizesConfig } from '@/lib/types';
import RingSizeTable from '@/components/store/RingSizeTable';

interface SizeGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ringSizes?: RingSizesConfig;
  guideImages?: PageImage[];
  defaultAudience?: 'ladies' | 'gents';
}

export default function SizeGuideModal({
  open,
  onOpenChange,
  ringSizes = DEFAULT_RING_SIZES,
  guideImages = [],
  defaultAudience = 'ladies',
}: SizeGuideModalProps) {
  const [audience, setAudience] = useState<'ladies' | 'gents'>(defaultAudience);

  useEffect(() => {
    if (open) {
      setAudience(defaultAudience);
    }
  }, [open, defaultAudience]);

  const rows = audience === 'gents' ? ringSizes.gents : ringSizes.ladies;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="size-guide-tip"
          className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white border-t sm:border border-line shadow-2xl max-h-[85dvh] overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="text-xs uppercase tracking-[0.18em] text-ink-2 block mb-1 font-semibold">
                GSS Ring Sizing
              </span>
              <Dialog.Title className="font-display text-2xl text-ink font-normal">
                Ring Size Chart
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close size guide"
                className="min-w-[44px] min-h-[44px] -mt-2 -mr-2 flex items-center justify-center text-ink-2 hover:text-ink text-lg"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          <div role="tablist" aria-label="Ring size category" className="grid grid-cols-2 gap-2 mb-4">
            {(['ladies', 'gents'] as const).map((tab) => {
              const selected = audience === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setAudience(tab)}
                  className={`min-h-[44px] text-xs uppercase tracking-wider font-semibold border transition ${selected
                    ? 'bg-ink text-white border-ink'
                    : 'bg-ground text-ink-2 border-line hover:text-ink'
                    }`}
                >
                  {tab === 'ladies' ? 'Ladies Rings' : 'Gents Rings'}
                </button>
              );
            })}
          </div>

          <RingSizeTable
            rows={rows}
            className="p-3.5 mb-4 border border-line bg-white"
            ariaLabel={audience === 'gents' ? 'Gents rings sizes' : 'Ladies rings sizes'}
          />

          {guideImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {guideImages.slice(0, 2).map((img, idx) => (
                <figure key={`${img.url}-${idx}`} className="border border-line bg-mist p-2">
                  <div className="relative aspect-[4/3] w-full bg-white overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.caption || `Sizing guide image ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 90vw, 220px"
                      className="object-contain"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="pt-1.5 text-xs text-ink-2 text-center line-clamp-1">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          <p id="size-guide-tip" className="text-xs text-ink-2 leading-relaxed mb-4">
            {ringSizes.fitTip || DEFAULT_RING_SIZES.fitTip}
          </p>

          <div className="mb-4 text-center">
            <Link
              href="/pages/size-guide"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center min-h-[44px] text-xs uppercase tracking-wider font-semibold text-ink underline hover:text-ink-2"
            >
              Open Full Size Guide &amp; Visuals →
            </Link>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="w-full bg-ink text-white min-h-[48px] text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition"
            >
              Close Size Guide
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
