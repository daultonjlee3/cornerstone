/** Lightweight route skeleton — section skeletons render inside FleetTodayView. */
export default function OperationsLoading() {
  return (
    <div className="space-y-8 animate-pulse p-1" data-testid="operations-center-loading">
      <div className="h-8 w-48 rounded bg-[var(--surface-border-subtle)]" />
      <div className="h-40 rounded-xl bg-[var(--surface-border-subtle)]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface-border-subtle)]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-[var(--surface-border-subtle)]" />
        <div className="h-64 rounded-xl bg-[var(--surface-border-subtle)]" />
      </div>
    </div>
  );
}
