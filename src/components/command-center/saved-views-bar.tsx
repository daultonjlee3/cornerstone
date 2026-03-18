"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type SavedViewItem = {
  id: string;
  label: string;
  /** Value set in URL when this view is selected (e.g. "open", "overdue"). */
  value: string;
};

export type SavedViewsBarProps = {
  /** Base path (e.g. "/work-orders", "/assets"). */
  path: string;
  /** URL param name for the view (default "view"). */
  paramName?: string;
  views: SavedViewItem[];
  /** Optional label before the buttons (e.g. "Saved views:") */
  label?: string;
};

/**
 * Reusable saved-views row: sets a single URL param to filter the list.
 * Summary counts must be computed separately (no list filters) so they stay stable.
 */
export function SavedViewsBar({
  path,
  paramName = "view",
  views,
  label = "Saved views:",
}: SavedViewsBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(paramName) ?? "";

  const applyView = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "") next.delete(paramName);
      else next.set(paramName, value);
      const query = next.toString();
      router.push(`${path}${query ? `?${query}` : ""}`);
    },
    [router, searchParams, paramName, path]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      {views.map(({ id, label: viewLabel, value }) => (
        <button
          key={id}
          type="button"
          onClick={() => applyView(value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            currentValue === value
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--background)]"
          }`}
        >
          {viewLabel}
        </button>
      ))}
    </div>
  );
}
