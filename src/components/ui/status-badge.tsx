type BadgeTone =
  | "gray"
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "teal"
  | "purple";

/* Soft backgrounds + darker text for readability. Subtle border for definition. */
const toneClass: Record<BadgeTone, string> = {
  gray:
    "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600",
  blue:
    "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700",
  green:
    "border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700",
  red:
    "border-red-200 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700",
  amber:
    "border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  teal:
    "border-teal-200 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-700",
  purple:
    "border-purple-200 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700",
};

/* Status palette: New (neutral/blue), In Progress (blue), On Hold (orange), Completed (green), Overdue/Cancelled (red). */
const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "gray" },
  new: { label: "New", tone: "blue" },
  open: { label: "Open", tone: "blue" },
  ready_to_schedule: { label: "Ready", tone: "teal" },
  assigned: { label: "Assigned", tone: "teal" },
  scheduled: { label: "Scheduled", tone: "gray" },
  in_progress: { label: "In Progress", tone: "blue" },
  on_hold: { label: "On Hold", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  closed: { label: "Closed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  overdue: { label: "Overdue", tone: "red" },
  active: { label: "Active", tone: "green" },
  paused: { label: "Paused", tone: "amber" },
  archived: { label: "Archived", tone: "gray" },
  inactive: { label: "Inactive", tone: "gray" },
  retired: { label: "Retired", tone: "red" },
  pending: { label: "Pending", tone: "purple" },
  submitted: { label: "Submitted", tone: "blue" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  converted_to_work_order: { label: "Converted", tone: "teal" },
  generated: { label: "Generated", tone: "blue" },
  failed: { label: "Failed", tone: "red" },
  skipped: { label: "Skipped", tone: "gray" },
};

type StatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = String(status ?? "").toLowerCase();
  const config = STATUS_MAP[key] ?? {
    label: key.replace(/_/g, " ") || "Unknown",
    tone: "gray" as const,
  };

  return (
    <span
      className={`ui-badge ${toneClass[config.tone]} hover:opacity-90 ${className}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
}
