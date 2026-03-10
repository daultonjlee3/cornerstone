"use client";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[var(--muted)]/20 text-[var(--muted)]" },
  new: { label: "New", className: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  ready_to_schedule: {
    label: "Ready to Schedule",
    className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  },
  scheduled: { label: "Scheduled", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  open: { label: "Open", className: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  assigned: { label: "Assigned", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  in_progress: { label: "In Progress", className: "bg-[var(--accent)]/20 text-[var(--accent)]" },
  on_hold: { label: "On Hold", className: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
  closed: { label: "Closed", className: "bg-[var(--muted)]/20 text-[var(--muted)]" },
};

type WorkOrderStatusBadgeProps = {
  status: string;
};

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-[var(--muted)]/20 text-[var(--muted)]" };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
