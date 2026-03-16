/** Skeleton shown while operations intelligence data fetches. */
export default function ReportsOperationsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-[var(--card-border)]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[var(--card-border)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--card-border)]" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--card-border)]" />
        </div>
      </div>
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          />
        ))}
      </div>
      {/* Chart panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          />
        ))}
      </div>
      {/* Report table */}
      <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
    </div>
  );
}
