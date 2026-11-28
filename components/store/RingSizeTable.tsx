import type { RingSizeEntry } from '@/lib/types';

interface RingSizeTableProps {
  rows: RingSizeEntry[];
  ariaLabel: string;
  compact?: boolean;
  className?: string;
}

/** Keyboard-accessible scrollable ring size chart shared by /pages/size-guide and SizeGuideModal. */
export default function RingSizeTable({
  rows,
  ariaLabel,
  compact = false,
  className = '',
}: RingSizeTableProps) {
  if (!rows || rows.length === 0) return null;
  const hasNotes = rows.some((r) => Boolean(r.note && r.note.trim()));
  const cellPad = compact ? 'py-2.5 px-3' : 'py-2.5 px-3 sm:px-4';

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      className={`overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${className}`}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr
            className={`border-b border-line uppercase tracking-wider ${
              compact ? 'bg-ground text-ink text-xs' : 'bg-white text-ink-2'
            }`}
          >
            <th className={`${cellPad} font-semibold`}>Size</th>
            <th className={`${cellPad} font-semibold`}>Diameter (mm)</th>
            <th className={`${cellPad} font-semibold`}>Circumference (mm)</th>
            {hasNotes && <th className={`${cellPad} font-semibold`}>Note</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-ink-2">
          {rows.map((row) => (
            <tr key={row.size}>
              <td className={`${cellPad} font-semibold text-ink`}>{row.size}</td>
              <td className={cellPad}>{row.diameterMm} mm</td>
              <td className={cellPad}>{row.circumferenceMm} mm</td>
              {hasNotes && <td className={cellPad}>{row.note || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
