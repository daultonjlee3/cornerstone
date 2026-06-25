import { StatusChip } from "@/src/components/design-system";
import { STATUS_CHIP_MAP } from "@/src/components/design-system/chip-maps";

type StatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

/** Wraps StatusChip — use StatusChip directly in new code. */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = String(status ?? "").toLowerCase();
  const config = STATUS_CHIP_MAP[key] ?? {
    label: key.replace(/_/g, " ") || "Unknown",
    tone: "neutral" as const,
  };

  return (
    <StatusChip
      label={config.label}
      tone={config.tone}
      showDot={false}
      className={className}
    />
  );
}
