import type { RingSizeEntry } from '@/lib/types';

interface RingSizeTableProps {
  rows: RingSizeEntry[];
  ariaLabel: string;
  className?: string;
}

/** Responsive Ladies/Gents ring size list shared by /pages/size-guide and SizeGuideModal. */
export default function RingSizeTable({
  rows,
  ariaLabel,
  className = '',
}: RingSizeTableProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className={className}>
            <ul aria-label={ariaLabel} className="flex flex-wrap gap-2">
              {rows.map((row) => (
                <li
                  key={row.size}
                  className="inline-flex items-baseline gap-1.5 min-w-[44px] justify-center px-3.5 py-2 border border-line bg-ground text-xs"
                >
          <span className="font-semibold text-ink">{row.size}</span>
          {row.note?.trim() && (
            <span className="text-ink-2">· {row.note.trim()}</span>
          )}
        </li>
        ))}
      </ul>
    </div>
  );
}
