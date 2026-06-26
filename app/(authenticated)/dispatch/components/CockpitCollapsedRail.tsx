"use client";

import { ChevronLeft, ChevronRight, Inbox, Sparkles } from "lucide-react";

type CockpitCollapsedRailProps = {
  side: "left" | "right";
  label: string;
  count: number;
  accent?: boolean;
  onExpand: () => void;
};

export function CockpitCollapsedRail({
  side,
  label,
  count,
  accent,
  onExpand,
}: CockpitCollapsedRailProps) {
  const Icon = side === "left" ? Inbox : Sparkles;

  return (
    <button
      type="button"
      className={`dispatch-console__rail-collapsed dispatch-console__rail-collapsed--${side}`}
      onClick={onExpand}
      aria-label={`Expand ${label}`}
      title={`Expand ${label}`}
    >
      {side === "left" ? (
        <ChevronRight className="dispatch-console__rail-collapsed-chevron" />
      ) : (
        <ChevronLeft className="dispatch-console__rail-collapsed-chevron" />
      )}
      <Icon className={`size-4 ${accent ? "text-[var(--brand-operational)]" : "text-[var(--text-muted)]"}`} />
      <span className="dispatch-console__rail-collapsed-label">{label}</span>
      {count > 0 ? <span className="dispatch-console__rail-collapsed-badge">{count}</span> : null}
    </button>
  );
}
