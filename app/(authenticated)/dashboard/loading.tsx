/** Skeleton shown while the dashboard server component fetches data. */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-52 animate-pulse rounded bg-[var(--card-border)]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[var(--card-border)]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--card-border)]" />
      </div>
      {/* KPI metrics row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          />
        ))}
      </div>
      {/* Main content panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
        <div className="h-72 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
      </div>
    </div>
  );
}
