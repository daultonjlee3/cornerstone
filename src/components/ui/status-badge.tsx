type BadgeTone =
  | "gray"
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "teal"
  | "purple";

const toneClass: Record<BadgeTone, string> = {
  gray: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "gray" },
  new: { label: "New", tone: "amber" },
  open: { label: "Open", tone: "amber" },
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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[config.tone]} ${className}`}
    >
      {config.label}
    </span>
  );
}
