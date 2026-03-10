"use client";

import { useRouter, usePathname } from "next/navigation";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams } from "../filter-state";
import type { DispatchFilterOptions, DispatchInsights } from "../dispatch-data";

export type DispatchTopBarProps = {
  filterState: DispatchFilterState;
  filterOptions: DispatchFilterOptions;
  insights: DispatchInsights;
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function DispatchTopBar({ filterState, filterOptions, insights }: DispatchTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const setView = (viewMode: "day" | "week" | "month") => {
    const next: DispatchFilterState = { ...filterState, viewMode };
    const params = filterStateToParams(next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const shiftDate = (delta: number) => {
    const d = new Date(filterState.selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${day}`;
    const next: DispatchFilterState = { ...filterState, selectedDate: date };
    const params = filterStateToParams(next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)]/50 hover:text-[var(--foreground)]"
            aria-label="Previous day"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[180px] text-sm font-medium text-[var(--foreground)]">
            {formatDisplayDate(filterState.selectedDate)}
          </span>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)]/50 hover:text-[var(--foreground)]"
            aria-label="Next day"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex rounded-lg border border-[var(--card-border)] p-0.5">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                filterState.viewMode === mode
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        <span>Overdue: {insights.overdue}</span>
        <span>Ready: {insights.ready}</span>
        <span>Unscheduled: {insights.unscheduled}</span>
        <span>Scheduled today: {insights.scheduledToday}</span>
      </div>
    </div>
  );
}
