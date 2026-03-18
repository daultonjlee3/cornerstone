/** Skeleton shown while the work order detail server component fetches data. */

export default function WorkOrderDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--card-border)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--card-border)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--card-border)]" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--card-border)]" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)] lg:col-span-2" />
        <div className="h-48 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
        <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
      </div>
    </div>
  );
}
