"use client";

export type DetailActionBarProps = {
  children: React.ReactNode;
  /** Optional class. Use for sticky bottom on mobile. */
  className?: string;
  /** If true, bar is sticky at bottom (e.g. mobile overlay). */
  stickyBottom?: boolean;
};

/**
 * Horizontal action bar for primary actions in the detail pane.
 * Use for Assign, Change status, Start, Complete, Add note, etc.
 */
export function DetailActionBar({ children, className = "", stickyBottom = false }: DetailActionBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-t border-[var(--card-border)]/80 bg-[var(--card)] px-5 py-3 ${
        stickyBottom ? "sticky bottom-0 z-10 shadow-[0_-2px 8px rgba(0,0,0,0.04)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
