'use client';

import * as Dialog from '@radix-ui/react-dialog';

interface SizeGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SizeGuideModal({ open, onOpenChange }: SizeGuideModalProps) {
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
                Ring Size Chart (US Standard)
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

          <div className="overflow-x-auto text-xs text-left mb-5">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line bg-ground text-ink uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3 font-semibold">US Size</th>
                  <th className="py-2.5 px-3 font-semibold">Diameter (mm)</th>
                  <th className="py-2.5 px-3 font-semibold">Circumference (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-2">
                <tr><td className="py-2.5 px-3 font-semibold text-ink">5</td><td className="py-2.5 px-3">15.7 mm</td><td className="py-2.5 px-3">49.3 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">6</td><td className="py-2.5 px-3">16.5 mm</td><td className="py-2.5 px-3">51.8 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">7</td><td className="py-2.5 px-3">17.3 mm</td><td className="py-2.5 px-3">54.4 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">8</td><td className="py-2.5 px-3">18.1 mm</td><td className="py-2.5 px-3">56.9 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">9</td><td className="py-2.5 px-3">18.9 mm</td><td className="py-2.5 px-3">59.5 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">10</td><td className="py-2.5 px-3">19.8 mm</td><td className="py-2.5 px-3">62.1 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">11</td><td className="py-2.5 px-3">20.6 mm</td><td className="py-2.5 px-3">64.6 mm</td></tr>
                <tr><td className="py-2.5 px-3 font-semibold text-ink">12</td><td className="py-2.5 px-3">21.4 mm</td><td className="py-2.5 px-3">67.2 mm</td></tr>
              </tbody>
            </table>
          </div>

          <p id="size-guide-tip" className="text-xs text-ink-2 leading-relaxed mb-6">
            Tip: If you fall between sizes, we recommend selecting the larger size for wider bands.
          </p>

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
