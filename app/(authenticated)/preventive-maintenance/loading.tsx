/** Skeleton shown while the PM list server component fetches data. */
export default function PreventiveMaintenanceLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-52 animate-pulse rounded bg-[var(--card-border)]" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[var(--card-border)]" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[var(--card-border)]" />
      </div>
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-24 animate-pulse rounded bg-[var(--card-border)]" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
        <div className="border-b border-[var(--card-border)] bg-[var(--background)] px-4 py-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-24 animate-pulse rounded bg-[var(--card-border)]" />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-[var(--card-border)] px-4 py-3 last:border-0"
          >
            <div className="h-4 w-36 animate-pulse rounded bg-[var(--card-border)]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--card-border)]" />
            <div className="h-4 w-20 animate-pulse rounded bg-[var(--card-border)]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--card-border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
