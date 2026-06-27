"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { formatDataFreshness } from "@/src/lib/fleet/ui/format";

/** Stable first paint — avoids SSR/client mismatch from Date.now() in formatDataFreshness. */
const HYDRATION_PLACEHOLDER = "Just updated";

function useRelativeFreshness(iso: string | null | undefined): string {
  const [label, setLabel] = useState(HYDRATION_PLACEHOLDER);

  useEffect(() => {
    const tick = () => setLabel(formatDataFreshness(iso));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [iso]);

  return label;
}

type RelativeFreshnessProps = {
  iso: string | null | undefined;
  prefix?: string;
  className?: string;
};

export function RelativeFreshness({ iso, prefix = "", className }: RelativeFreshnessProps) {
  const label = useRelativeFreshness(iso);
  return (
    <span className={className} title={iso ? new Date(iso).toLocaleString() : undefined}>
      {prefix}
      {label}
    </span>
  );
}

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
      <Radio className="size-3 text-[var(--brand-operational)]" strokeWidth={2} aria-hidden />
      <RelativeFreshness iso={updatedAt ?? new Date().toISOString()} prefix="Data " />
    </span>
  );
}
