import Link from 'next/link';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  buildHref: (nextPage: number) => string;
}

export default function AdminPagination({
  page,
  totalPages,
  total,
  limit,
  buildHref,
}: AdminPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-2">
      <span>
        Showing {start}–{end} of {total}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="border border-line bg-white px-4 min-h-[44px] inline-flex items-center text-ink font-medium hover:border-ink"
            >
              ← Previous
            </Link>
          ) : (
            <span className="border border-line/50 px-4 min-h-[44px] inline-flex items-center opacity-40">
              ← Previous
            </span>
          )}

          <span className="font-medium text-ink">
            Page {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className="border border-line bg-white px-4 min-h-[44px] inline-flex items-center text-ink font-medium hover:border-ink"
            >
              Next →
            </Link>
          ) : (
            <span className="border border-line/50 px-4 min-h-[44px] inline-flex items-center opacity-40">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
