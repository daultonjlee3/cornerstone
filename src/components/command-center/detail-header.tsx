"use client";

import Link from "next/link";

export type DetailHeaderProps = {
  /** Title line 1 (e.g. record number). */
  title: string;
  /** Optional subtitle (e.g. record name). */
  subtitle?: React.ReactNode;
  /** Optional badges/tags (status, priority). */
  badges?: React.ReactNode;
  /** Link to full-page detail. If provided, "View full" is shown. */
  viewFullHref?: string;
  /** Called when user clicks back/close. On desktop may be no-op if layout has no close. */
  onClose?: () => void;
  /** Show back button (e.g. on overlay only). */
  showBack?: boolean;
  /** Optional class for the header container. */
  className?: string;
};

/**
 * Sticky header for the detail pane. Use at top of DetailDrawer.
 * Supports back/close for overlay, optional "View full" link, title + badges.
 */
export function DetailHeader({
  title,
  subtitle,
  badges,
  viewFullHref,
  onClose,
  showBack = false,
  className = "",
}: DetailHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-10 flex flex-col gap-2 border-b border-[var(--card-border)]/80 bg-[var(--card)] px-5 py-4 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showBack && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="-ml-1 rounded p-1.5 text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="truncate text-[17px] font-medium tracking-tight text-[var(--foreground)]">{title}</h2>
          </div>
          {subtitle != null && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)] leading-snug">{subtitle}</p>
          )}
          {badges != null && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewFullHref && (
            <Link
              href={viewFullHref}
              className="rounded-lg bg-[var(--accent)]/90 px-3 py-2 text-[13px] font-medium text-white transition-opacity duration-150 hover:bg-[var(--accent-hover)]"
            >
              View full
            </Link>
          )}
          {!showBack && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
