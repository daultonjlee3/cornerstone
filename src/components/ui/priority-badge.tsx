type PriorityTone = "gray" | "blue" | "amber" | "red";

const toneClass: Record<PriorityTone, string> = {
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-blue-200 bg-blue-100 text-blue-700",
  amber: "border-amber-200 bg-amber-100 text-amber-700",
  red: "border-red-200 bg-red-100 text-red-700",
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
      className={`ui-badge ${toneClass[config.tone]} ${className}`}
    >
      {config.label}
    </span>
  );
}
