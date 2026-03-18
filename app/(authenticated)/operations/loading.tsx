/** Skeleton shown while the Operations Center server component fetches dashboard data. */

export default function OperationsLoading() {
  return (
    <div className="space-y-8" data-testid="operations-center-loading">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--card-border)]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--card-border)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
        <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)] lg:col-span-2" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--card-border)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
          <div className="h-80 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          />
        ))}
      </div>
    </div>
  );
}
