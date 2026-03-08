"use client";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-[var(--muted)]/20 text-[var(--muted)]" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  high: { label: "High", className: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  urgent: { label: "Urgent", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
  emergency: { label: "Emergency", className: "border border-red-500 bg-transparent text-red-600 dark:border-red-400 dark:text-red-400" },
};

type WorkOrderPriorityBadgeProps = {
  priority: string;
};

export function WorkOrderPriorityBadge({ priority }: WorkOrderPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? { label: priority, className: "bg-[var(--muted)]/20 text-[var(--muted)]" };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
