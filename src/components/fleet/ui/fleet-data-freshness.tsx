import { Radio } from "lucide-react";
import { formatDataFreshness } from "@/src/lib/fleet/ui/format";

type FleetDataFreshnessProps = {
  updatedAt?: string | null;
  className?: string;
};

export function FleetDataFreshness({ updatedAt, className = "" }: FleetDataFreshnessProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-[var(--muted)] ${className}`}
      title={updatedAt ? new Date(updatedAt).toLocaleString() : undefined}
    >
      <Radio className="size-3 text-[var(--accent)]" strokeWidth={2} aria-hidden />
      <span>Data {formatDataFreshness(updatedAt ?? new Date().toISOString())}</span>
    </span>
  );
}
