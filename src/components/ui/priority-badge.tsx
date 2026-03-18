type PriorityTone = "gray" | "blue" | "amber" | "orange" | "red";

/* Priority: Low (neutral), Medium (blue), High (amber), Urgent/Emergency (orange/red). Clear contrast. */
const toneClass: Record<PriorityTone, string> = {
  gray:
    "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600",
  blue:
    "border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700",
  amber:
    "border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  orange:
    "border-orange-200 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700",
  red:
    "border-red-200 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700",
};

const PRIORITY_MAP: Record<string, { label: string; tone: PriorityTone }> = {
  low: { label: "Low", tone: "gray" },
  medium: { label: "Medium", tone: "blue" },
  high: { label: "High", tone: "amber" },
  urgent: { label: "Urgent", tone: "orange" },
  emergency: { label: "Emergency", tone: "red" },
};

type PriorityBadgeProps = {
  priority: string | null | undefined;
  className?: string;
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const key = String(priority ?? "medium").toLowerCase();
  const config = PRIORITY_MAP[key] ?? { label: "Medium", tone: "blue" as const };
  return (
    <span
      className={`ui-badge ${toneClass[config.tone]} hover:opacity-90 ${className}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
}
