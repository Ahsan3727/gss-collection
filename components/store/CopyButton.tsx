'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="min-h-[44px] px-4 py-1 border border-line bg-ground text-xs font-medium text-ink hover:border-ink transition"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
