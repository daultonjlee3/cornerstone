import { StatusChip } from "@/src/components/design-system";
import { PRIORITY_CHIP_MAP } from "@/src/components/design-system/chip-maps";

type PriorityBadgeProps = {
  priority: string | null | undefined;
  className?: string;
};

/** Wraps StatusChip — use StatusChip directly in new code. */
export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const key = String(priority ?? "medium").toLowerCase();
  const config = PRIORITY_CHIP_MAP[key] ?? { label: "Medium", tone: "info" as const };

  return (
    <StatusChip
      label={config.label}
      tone={config.tone}
      showDot={false}
      className={className}
    />
  );
}
