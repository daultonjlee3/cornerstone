/** Skeleton shown while the dispatch board server component fetches data. */
export default function DispatchLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-36 animate-pulse rounded bg-[var(--card-border)]" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--card-border)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--card-border)]" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--card-border)]" />
        </div>
      </div>
      {/* Technician columns */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-w-[260px] flex-1 space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--card-border)]" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="h-20 animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--background)]"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
