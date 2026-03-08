"use client";

type Stat = { label: string; value: number };

type WorkOrderStatsProps = {
  stats: { open: number; assigned: number; inProgress: number; dueToday: number; completedThisWeek: number };
};

export function WorkOrderStats({ stats }: WorkOrderStatsProps) {
  const items: Stat[] = [
    { label: "Open", value: stats.open },
    { label: "Assigned", value: stats.assigned },
    { label: "In Progress", value: stats.inProgress },
    { label: "Due Today", value: stats.dueToday },
    { label: "Completed This Week", value: stats.completedThisWeek },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
      ))}
    </div>
  );
}
