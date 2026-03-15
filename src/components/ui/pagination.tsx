"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  /** 1-based current page */
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Optional: allow changing page size via URL/state */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <div className="flex items-center gap-4">
        <p className="text-sm text-[var(--muted)]">
          Showing <span className="font-medium text-[var(--foreground)]">{start}</span>
          –<span className="font-medium text-[var(--foreground)]">{end}</span> of{" "}
          <span className="font-medium text-[var(--foreground)]">{totalCount}</span>
        </p>
        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)]"
            aria-label="Items per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded border border-[var(--card-border)] bg-[var(--background)] p-2 text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[100px] px-3 py-1 text-center text-sm text-[var(--muted)]">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded border border-[var(--card-border)] bg-[var(--background)] p-2 text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
