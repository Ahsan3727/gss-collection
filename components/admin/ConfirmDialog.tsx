'use client';

import * as Dialog from '@radix-ui/react-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white border border-line p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="font-display text-2xl font-normal text-ink mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-ink-2 leading-relaxed mb-6">
            {description}
          </Dialog.Description>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="border border-line bg-white text-ink px-5 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:border-ink"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={`px-5 min-h-[44px] text-xs uppercase tracking-wider font-semibold text-white ${
                destructive ? 'bg-error hover:opacity-90' : 'bg-ink hover:bg-neutral-800'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
