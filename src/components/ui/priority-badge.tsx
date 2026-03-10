type PriorityTone = "gray" | "blue" | "amber" | "red";

const toneClass: Record<PriorityTone, string> = {
  gray: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const PRIORITY_MAP: Record<string, { label: string; tone: PriorityTone }> = {
  low: { label: "Low", tone: "gray" },
  medium: { label: "Medium", tone: "blue" },
  high: { label: "High", tone: "amber" },
  urgent: { label: "Emergency", tone: "red" },
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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[config.tone]} ${className}`}
    >
      {config.label}
    </span>
  );
}
